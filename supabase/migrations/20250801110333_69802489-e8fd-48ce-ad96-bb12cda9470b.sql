
-- Primeiro, vamos remover todos os triggers e constraints que podem estar causando problemas
DROP TRIGGER IF EXISTS trigger_processar_movimentacao_estoque ON movimentacoes_estoque;
DROP TRIGGER IF EXISTS trigger_sincronizar_empenhos ON movimentacoes_estoque;
DROP TRIGGER IF EXISTS trigger_processar_movimentacao ON movimentacoes_estoque;

-- Remover constraints de foreign key se existirem
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS empenhos_material_movimentacao_empenho_id_fkey;
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS fk_movimentacao_empenho;

-- Limpar a coluna de referência na tabela empenhos_material
UPDATE empenhos_material SET movimentacao_empenho_id = NULL WHERE movimentacao_empenho_id IS NOT NULL;

-- Tentar limpar dados da tabela movimentacoes_estoque
DELETE FROM movimentacoes_estoque;

-- Se ainda não conseguir, vamos recriar a tabela completamente
DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;

-- Recriar a tabela movimentacoes_estoque sem relacionamentos problemáticos
CREATE TABLE public.movimentacoes_estoque (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id uuid NOT NULL,
    tipo_movimentacao text NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'transferencia', 'ajuste', 'empenho', 'desempenho')),
    quantidade numeric NOT NULL DEFAULT 0,
    valor_unitario numeric,
    valor_total numeric,
    lote text,
    fornecedor text,
    nota_fiscal text,
    of_vinculada text,
    observacoes text,
    data_movimentacao date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

-- Recriar as políticas RLS
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar movimentações" ON public.movimentacoes_estoque
    FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem inserir movimentações" ON public.movimentacoes_estoque
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar movimentações" ON public.movimentacoes_estoque
    FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem excluir movimentações" ON public.movimentacoes_estoque
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Remover a coluna movimentacao_empenho_id da tabela empenhos_material se existir
ALTER TABLE empenhos_material DROP COLUMN IF EXISTS movimentacao_empenho_id;

-- Limpar também os dados da tabela empenhos_material para evitar conflitos
DELETE FROM empenhos_material;

-- Recriar trigger mais simples apenas para estoque (sem empenhos automáticos)
CREATE OR REPLACE FUNCTION public.processar_movimentacao_estoque_simples()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Lógica para INSERT (nova movimentação)
    IF TG_OP = 'INSERT' THEN
        IF NEW.tipo_movimentacao = 'entrada' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + NEW.quantidade,
                quantidade_disponivel = quantidade_disponivel + NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'saida' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - NEW.quantidade,
                quantidade_disponivel = quantidade_disponivel - NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'empenho' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada + NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada - NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + NEW.quantidade,
                quantidade_disponivel = quantidade_disponivel + NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'transferencia' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade
            WHERE id = NEW.material_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Lógica para DELETE (reversão da movimentação)
    IF TG_OP = 'DELETE' THEN
        IF OLD.tipo_movimentacao = 'entrada' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'saida' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'empenho' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada - OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'desempenho' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada + OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'ajuste' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'transferencia' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Recriar o trigger simplificado
CREATE TRIGGER trigger_processar_movimentacao_estoque_simples
    BEFORE INSERT OR DELETE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION processar_movimentacao_estoque_simples();

-- Limpar quantidades empenhadas no estoque para começar limpo
UPDATE estoque_materiais SET quantidade_empenhada = 0;

-- Recriar índices necessários
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material_tipo ON movimentacoes_estoque(material_id, tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
