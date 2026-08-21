import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgres://supabase_admin:Xz0oyb6ArGYG5uAVTVwcvJxRrMuT7EIJ@10.0.2.6:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Postgres successfully!");

    // 1. Fix trigger function to have explicit search_path or schema qualification
    const fixTriggerSQL = `
      -- Criar função para verificar disponibilidade de peças no schema TS_ERP com search_path explícito
      CREATE OR REPLACE FUNCTION "TS_ERP".verificar_disponibilidade_peca(
          p_peca_id uuid,
          p_quantidade_adicional numeric,
          p_item_id uuid DEFAULT NULL
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = 'TS_ERP', 'public'
      AS $$
      DECLARE
          quantidade_total_peca numeric;
          quantidade_ja_priorizada numeric;
          quantidade_disponivel numeric;
      BEGIN
          SELECT quantidade INTO quantidade_total_peca
          FROM "TS_ERP".pecas 
          WHERE id = p_peca_id;
          
          IF quantidade_total_peca IS NULL THEN
              RAISE EXCEPTION 'Peça não encontrada';
          END IF;
          
          SELECT COALESCE(SUM(quantidade_priorizada), 0) INTO quantidade_ja_priorizada
          FROM "TS_ERP".itens_prioridade_fabricacao 
          WHERE peca_id = p_peca_id 
          AND (p_item_id IS NULL OR id != p_item_id);
          
          quantidade_disponivel := quantidade_total_peca - quantidade_ja_priorizada;
          
          IF p_quantidade_adicional > quantidade_disponivel THEN
              RAISE EXCEPTION 'Quantidade solicitada (%) excede o disponível (%) para esta peça', 
                  p_quantidade_adicional, quantidade_disponivel;
          END IF;
          
          RETURN true;
      END;
      $$;

      -- Também criar no schema public por garantia se algum cliente chamar public.verificar_disponibilidade_peca
      CREATE OR REPLACE FUNCTION public.verificar_disponibilidade_peca(
          p_peca_id uuid,
          p_quantidade_adicional numeric,
          p_item_id uuid DEFAULT NULL
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = 'TS_ERP', 'public'
      AS $$
      BEGIN
          RETURN "TS_ERP".verificar_disponibilidade_peca(p_peca_id, p_quantidade_adicional, p_item_id);
      END;
      $$;

      -- Atualizar trigger_validar_item_prioridade com SET search_path
      CREATE OR REPLACE FUNCTION "TS_ERP".trigger_validar_item_prioridade()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = 'TS_ERP', 'public'
      AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              PERFORM "TS_ERP".verificar_disponibilidade_peca(NEW.peca_id, NEW.quantidade_priorizada);
              RETURN NEW;
          END IF;
          
          IF TG_OP = 'UPDATE' THEN
              PERFORM "TS_ERP".verificar_disponibilidade_peca(NEW.peca_id, NEW.quantidade_priorizada, NEW.id);
              RETURN NEW;
          END IF;
          
          RETURN NULL;
      END;
      $$;

      -- Garantir o trigger na tabela
      DROP TRIGGER IF EXISTS trigger_validar_disponibilidade_item_prioridade ON "TS_ERP".itens_prioridade_fabricacao;
      CREATE TRIGGER trigger_validar_disponibilidade_item_prioridade
          BEFORE INSERT OR UPDATE ON "TS_ERP".itens_prioridade_fabricacao
          FOR EACH ROW
          EXECUTE FUNCTION "TS_ERP".trigger_validar_item_prioridade();
          
      -- Reconfigurar permissões
      GRANT EXECUTE ON FUNCTION "TS_ERP".verificar_disponibilidade_peca(uuid, numeric, uuid) TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION public.verificar_disponibilidade_peca(uuid, numeric, uuid) TO anon, authenticated, service_role;
    `;

    await client.query(fixTriggerSQL);
    console.log("✅ Trigger e funções de verificação atualizadas com sucesso no banco de dados!");

  } catch (err) {
    console.error("❌ Erro ao conectar/executar no Postgres:", err);
  } finally {
    await client.end();
  }
}

main();
