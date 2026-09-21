# Plano de Arquitetura & UX: "Modo Smart" (TrackSteel APP)

> **Documento de Planejamento de Interface Simplificada para Chão de Fábrica e Tablets/Celulares**  
> *Versão:* 1.0  
> *Data:* 21/09/2026  
> *Status:* Planejamento (Aguardando aprovação para desenvolvimento)

---

## 1. Visão Geral e Propósito

O **Modo Smart** é uma interface simplificada, de alto contraste e focada em toque (Touch-First), projetada para operadores de chão de fábrica e equipes de canteiro de obras.

### Pilares Fundamentais:
1. **Foco Total em Celular (Mobile-First & Touch-First):** 
   - Botões gigantes com altura mínima de 56px a 72px (área de toque perfeita para polegares, mesmo usando luvas).
   - Ações principais concentradas na "zona do polegar" (metade inferior da tela).
   - Zero tabelas largas com rolagem horizontal que quebram a tela do celular.
   - Modais que abrem como *Bottom Sheets* (deslizam de baixo para cima, como nos apps de banco e entrega).
2. **Completude Total dos Dados (Zero Campos Faltantes):**
   - Nenhuma ação (como criação de Romaneio ou Apontamento) terá campos essenciais cortados.
   - Telas de formulário mobile organizadas com 4 a 5 campos inteligentes por bloco (pílulas de seleção para *Tipo de Transporte*, *Frete*, *Prioridade* e valores padrão automáticos para datas), garantindo que 100% dos dados exigidos pelo Supabase sejam gravados com perfeição.
3. **Sistema Inteligente de Memória e Repetição Rápida (Sticky Context / Fast Loop):**
   - **Fluxo Contínuo:** Ao apontar a peça `P-01`, o app emite o BIP de confirmação e **permanece na mesma lista de peças daquela Fase/Processo**, permitindo apontar a próxima peça (`P-02`) com 1 toque, sem precisar voltar 4 telas atrás!
   - **Breadcrumbs Interativos no Topo:** Barra compacta no topo `[ ⚡ Solda ▾ ] [ 🏢 Pilares ▾ ]` que permite trocar de processo ou fase instantaneamente com 1 toque quando o operador terminar aquele lote.
4. **Zero Curva de Aprendizado:** Navegação guiada em formato de esteira/passo a passo (Wizard de 1 ação por tela).
5. **Legibilidade no Sol / Fábrica:** Tipografia grande (16px a 24px), alto contraste e cartões visuais limpos.
6. **Eliminação de Ruído:** Esconde 90% das telas administrativas (BI, engenharia, configurações fiscais, cadastros pesados) e foca apenas nas ações essenciais do posto de trabalho.
7. **Integridade Absoluta do Banco de Dados:** O Modo Smart é 100% uma **camada visual (UI)**. Ele consome os mesmos hooks, serviços, validações e payloads existentes no app principal, garantindo risco zero de crash ou inconsistência no banco de dados.
8. **Sem Dependência de QR Code/Etiquetas:** Toda a seleção é baseada em listas limpas, botões grandes e buscas visuais diretas.
9. **Feedback Imediato:** Confirmações sonoras (BIP via Web Audio API) e vibração tátil para garantia de operação sem precisar ler letras pequenas.
10. **Relatórios e Compartilhamento:** Geração de relatórios em PDF com botões rápidos para envio via WhatsApp ou E-mail.

---

## 2. Ponto de Entrada e Alternância de Modos

### 2.1. Tela de Login e Configurações
- No momento do login (ou na barra superior após logado), o usuário pode escolher:
  - 🏢 **[ MODO COMPLETO ]** *(Dashboard, 3D, engenharia, relatórios, cadastros completos)*
  - ⚡ **[ MODO SMART ]** *(Operação rápida, botões gigantes, esteira guiada)*
- **Persistência no Aparelho:** A escolha fica gravada no `localStorage` do dispositivo. Tablets fixados em bancadas da fábrica já abrirão diretamente no Modo Smart.
- **Botão de Alternância:** No canto superior direito do Modo Smart haverá sempre um botão discreto `[ 🏢 Modo Completo ]` para troca rápida por encarregados.

---

## 3. Arquitetura de Telas e Árvore Completa de Botões

```
[ TELA 0: SELEÇÃO DE OBRA ]
       │
       ▼
[ TELA 1: HUB PRINCIPAL SMART (4 BOTÕES PRINCIPAIS) ]
  ├── 1. 🔨 APONTAR PRODUÇÃO
  ├── 2. 🚚 APONTAR EMBARQUE (ROMANEIO)
  ├── 3. 📦 APONTAR MONTAGEM (OBRA)
  └── 4. 🔍 CONSULTAR PEÇAS & RELATÓRIOS
```

---

### TELA 0: Seleção de Obra (Contexto Ativo)
- **Cabeçalho:** Nome do Usuário Logado | Botão `[ 🏢 Modo Completo ]` | Botão `[ 🚪 Sair ]`
- **Conteúdo Central:**
  - Campo de busca rápida de Obra (Grande);
  - Cards de Obras Ativas em botões retangulares grandes:
    - `[ 🏗️ Obra Galpão Industrial 01 - Cliente ABC ]`
    - `[ 🏗️ Obra Ponte Metálica Sul - Cliente XYZ ]`
- *(Ao tocar na obra, entra no Hub Principal carregando automaticamente os dados daquela obra).*

---

### TELA 1: Hub Principal Smart (Os 4 Botões Principais)
- **Barra Superior:** `[ ⬅️ Trocar Obra ]` | Obra Selecionada: **Galpão 01** | `[ 🔊 Som Ativo/Mudo ]`
- **Centro da Tela (Grade 2x2 ou Lista Vertical de Botões Gigantes):**
  1. 🔨 **[ 1. APONTAR PRODUÇÃO ]** *(Corte, Montagem, Solda, Pintura, etc.)*
  2. 🚚 **[ 2. APONTAR EMBARQUE ]** *(Romaneios e saída da fábrica)*
  3. 📦 **[ 3. APONTAR MONTAGEM ]** *(Conferência e avanço na obra)*
  4. 🔍 **[ 4. CONSULTAR PEÇAS & PDF ]** *(Status da peça e emissão de relatórios)*
- **Rodapé Informativo:**
  - Badge grande: `📊 Minha Produção Hoje: 42 peças apontadas (1.850 kg)`
  - Botão `[ 📄 Gerar Relatório do Meu Turno ]`

---

## 4. Detalhamento dos Botões Aninhados (Passo a Passo por Tela)

---

### 🔨 BOTÃO 1: APONTAR PRODUÇÃO

#### Tela 1.1 — Seleção do Processo / Etapa
- **Botões Grandes de Processo:**
  - `[ ✂️ CORTE ]`
  - `[ 📐 DOBRA / FURACÃO ]`
  - `[ 🧩 MONTAGEM ]`
  - `[ ⚡ SOLDA ]`
  - `[ 🎨 PINTURA ]`
  - `[ 🛡️ JATEAMENTO / GALVANIZAÇÃO ]`
  - `[ ⬅️ Voltar ao Menu ]`

#### Tela 1.2 — Seleção da Fase / Subconjunto
- Lista de Fases da Obra:
  - `[ 🏢 Pilares ]`
  - `[ 🏗️ Vigas Principais ]`
  - `[ 📐 Treliças ]`
  - `[ 📏 Terças / Fechamentos ]`
  - `[ 🔩 Placas de Base / Chumbadores ]`
  - `[ ⬅️ Voltar aos Processos ]`

#### Tela 1.3 — Lista de Peças Pendentes
- Cards de Peças com informações essenciais destacadas em fonte grande:
  - Card 1: **Marca: V-101** | Perfil: W250x32 | **Saldo: Falta 4 de 10** ➔ Botão `[ APONTAR ]`
  - Card 2: **Marca: P-205** | Perfil: CS300x50 | **Saldo: Falta 2 de 8** ➔ Botão `[ APONTAR ]`
  - `[ ⬅️ Voltar às Fases ]`

#### Tela 1.4 — Apontamento da Quantidade
- Resumo no Topo: **V-101** | Processo: **SOLDA** | Saldo Pendente: **4 peças**
- **Teclado de Ações Rápidas (Botões Gigantes):**
  - `[ +1 ]` `[ +2 ]` `[ +5 ]` `[ TODAS (4) ]`
  - Display da Quantidade Selecionada: **[ 4 ]**
  - Botão `[ 🔄 Zerar ]`
- **Botões de Confirmação:**
  - `[ ✅ CONFIRMAR APONTAMENTO ]` *(Gera BIP Sonoro de sucesso, vibração, salva no Supabase e volta para a lista de peças já atualizada)*
  - `[ ❌ Cancelar ]`

---

### 🚚 BOTÃO 2: APONTAR EMBARQUE (ROMANEIO)

#### Tela 2.1 — Escolha da Operação de Expedição
- `[ ➕ Criar Novo Romaneio Rápido ]`
- `[ 📋 Continuar Carregamento em Romaneio Aberto ]`
- `[ ⬅️ Voltar ao Menu ]`

#### Tela 2.2 — Seleção do Romaneio / Veículo
- Cards de Romaneios Abertos:
  - `[ 🚚 Romaneio #045 | Placa: ABC-1234 | 12/28 Peças Carregadas ]`
  - `[ 🚚 Romaneio #046 | Placa: XYZ-9876 | 0/15 Peças Carregadas ]`
  - `[ ⬅️ Voltar ]`

#### Tela 2.3 — Seleção e Embarque das Peças Prontas
- Lista apenas as peças que já tiveram todos os processos de fábrica concluídos e possuem saldo de embarque:
  - Card: **Viga V-101** | Prontas no Pátio: **10** | Já Embarcadas: **6** | Saldo: **4**
  - Botões de Quantidade a Embarcar: `[ +1 ]` `[ +2 ]` `[ TODAS (4) ]`
  - Botão `[ 📦 INCLUIR NO CAMINHÃO ]`
- **Botão Finalizador:**
  - `[ 🚚 FINALIZAR CARREGAMENTO DO ROMANEIO ]` *(BIP de sucesso + emite PDF do Romaneio se desejado)*
  - `[ ⬅️ Voltar ]`

---

### 📦 BOTÃO 3: APONTAR MONTAGEM (OBRA)

#### Tela 3.1 — Seleção do Setor de Montagem
- `[ 🏗️ Estrutura Principal / Pilares ]`
- `[ 📐 Cobertura / Tesouras / Terças ]`
- `[ 🪜 Mezaninos e Escadas ]`
- `[ ⬅️ Voltar ao Menu ]`

#### Tela 3.2 — Lista de Peças Recebidas na Obra
- Lista peças que já foram enviadas via Romaneio e estão no canteiro aguardando montagem:
  - Card: **Pilar P-01** | Entregues na Obra: **8** | Montados: **5** | Pendentes: **3**
  - Botões de Apontamento: `[ +1 ]` `[ +2 ]` `[ TODAS (3) ]`
- **Botão de Confirmação:**
  - `[ 🏗️ CONFIRMAR MONTAGEM ]` *(BIP sonoro + atualização imediata do status de montagem)*
  - `[ ⬅️ Voltar ]`

---

### 🔍 BOTÃO 4: CONSULTAR PEÇAS & RELATÓRIOS PDF

#### Tela 4.1 — Consulta Rápida de Peças
- **Campo de Busca Gigante:** `[ Digite a Marca, ex: V101 ]`
- **Filtros Rápidos por Toque:**
  - `[ ⚪ Todos ]` `[ 🔴 Fabricando ]` `[ 🟢 Pronto ]` `[ 🚚 Embarcado ]` `[ 🏗️ Montado ]`
- **Card da Peça com Linha do Tempo Visual:**
  - Mostra claramente em qual estágio a peça está:
    `[ Corte: ✅ ] ➔ [ Montagem: ✅ ] ➔ [ Solda: ✅ ] ➔ [ Pintura: ⏳ ] ➔ [ Embarque: ⭕ ] ➔ [ Obra: ⭕ ]`

#### Tela 4.2 — Emissão de Relatório em PDF & Compartilhamento
- **Opções de Relatórios em Botões Grandes:**
  1. `[ 📄 1. Relatório do Meu Turno (O que apontei hoje) ]`
  2. `[ 📋 2. Relatório de Produção Geral da Obra ]`
  3. `[ 🚚 3. Relatório de Peças Embarcadas / Romaneios ]`
  4. `[ ⚠️ 4. Relatório de Peças Pendentes de Fabricação ]`

- **Ações Imediatas após gerar o PDF:**
  - `[ 👁️ Visualizar na Tela ]`
  - `[ 📥 Baixar Arquivo PDF ]`
  - `[ 💬 Compartilhar no WhatsApp ]` *(Gera mensagem formatada com o resumo do dia + link/documento para envio direto no zap do encarregado/diretoria)*
  - `[ ✉️ Enviar por E-mail ]` *(Abre o cliente de e-mail com assunto e corpo pré-formatados)*

---

## 5. Especificação Técnica do Sistema de Som (BIP) e Áudio

Para não pesar o app e funcionar 100% offline em qualquer celular/tablet, utilizaremos a **Web Audio API** nativa do navegador:

- **Bip de Sucesso (Apontamento Gravado):** Frequência dupla suave e ascendente (587Hz -> 880Hz, duração de 120ms).
- **Bip de Alerta/Erro (Saldo Insuficiente):** Frequência baixa (220Hz, duração de 200ms).
- **Vibração Háptica:** `navigator.vibrate([70, 40, 70])` acionada em conjunto com o som nos celulares compatíveis.
- **Controle de Usuário:** Botão de Mudo/Ativo no cabeçalho para ambientes de escritório ou preferência pessoal.

---

## 6. Matriz de Auditoria Técnica e Mapeamento de Banco de Dados

Após varredura minuciosa em todos os hooks e serviços do aplicativo, mapeamos a integridade exata exigida por cada etapa:

### 6.1. Mapeamento: Apontamento de Produção (`apontamentos_producao`)
- **Tabela Principal:** `apontamentos_producao`
- **Tabelas Relacionadas:** `pecas`, `componentes_peca`, `processos_fabricacao`
- **Campos Obrigatórios e Tipagem:**
  - `of_number` (string) — OF vinculada à obra ativa
  - `tipo_apontamento` ('peca' | 'componente')
  - `peca_id` (UUID) — ID da peça no Supabase (ou ID da peça-pai no caso de componentes)
  - `componente_id` (UUID opcional) — ID do componente quando aplicável
  - `processo_id` (UUID) — ID da etapa ativa (`processos_fabricacao`)
  - `quantidade_produzida` (number) — Quantidade informada
  - `data_apontamento` (YYYY-MM-DD) — Data do turno
  - `created_by` (UUID) — ID do operador autenticado via `useAuth`
  - `observacoes` (string opcional)
- **Regras de Validação Auditadas:**
  - Validação sequencial de processos via `useValidacaoSequencialProcessos`: O operador não pode apontar quantidade maior do que a aprovada no processo imediatamente anterior.

---

### 6.2. Mapeamento: Expedição e Romaneios (`romaneios_expedicao` & `itens_romaneio_pecas`)
- **Tabelas Principais:** `romaneios_expedicao`, `itens_romaneio_pecas`, `itens_romaneio_insumos`
- **Campos Obrigatórios de Criação do Romaneio:**
  - `numero_romaneio` (string gerada automaticamente)
  - `of_number` (string)
  - `data_romaneio` (YYYY-MM-DD)
  - `data_criacao` (YYYY-MM-DD)
  - `revisao` (number, padrão 0)
  - `prioridade` ('Normal' | 'Urgente')
  - `status` ('Em planejamento' | 'Entregue' | 'Conferido em Obra')
  - `tipo_transporte` ('carro' | 'utilitario' | 'caminhao_pequeno' | 'caminhao_trucado' | 'caminhao_munck' | 'carreta_12m' | 'carreta_15m' | 'especial')
  - `frete_tipo` ('proprio' | 'terceiros')
  - `nome_motorista` (string)
  - `peso_total_romaneio` (number calculado com base nas peças adicionadas)
  - `created_by` (UUID)
- **Regras de Validação de Itens:**
  - Apenas peças com status final de fábrica (após pintura/inspeção) e com saldo positivo (`quantidade_produzida_pintura - quantidade_ja_expedida > 0`) podem ser embarcadas.

---

### 6.3. Mapeamento: Montagem em Obra (`apontamentos_peca_obra` & `diario_obra_rdo`)
- **Tabelas Principais:** `apontamentos_peca_obra`, `diario_obra_rdo`
- **Campos Obrigatórios:**
  - `rdo_id` (UUID do RDO da data da obra)
  - `marca_peca` (string)
  - `quantidade` (number)
- **Cálculo de Saldo de Montagem:**
  - Saldo disponível para montar = `Total Expedido nos Romaneios` - `Total já Apontado no RDO` (auditado conforme `usePecasExpedidas`).

---

### 6.4. Mapeamento: Relatórios e Compartilhamento
- **Bibliotecas:** `jspdf` (v4.2.0) e `jspdf-autotable` (v5.0.7)
- **Saídas:**
  - PDF do Turno (peças apontadas pelo operador naquele dia)
  - PDF Geral da Obra (avanço percentual por processo)
  - Exportação direta via WhatsApp com resumo em texto e link do PDF.

---

## 7. Próximos Passos (Aguardando Aprovação)

1. Revisão final da auditoria pelo usuário;
2. Desenvolvimento da casca visual do **Modo Smart** no padrão Mobile-First;
3. Testes em emulador mobile e validação de gravação no banco de dados.
