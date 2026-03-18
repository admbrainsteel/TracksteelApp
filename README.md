# TrackSteel — Plataforma de Gestão Industrial

Sistema de gestão industrial para fabricação de estruturas metálicas. Controle completo de Ordens de Fabricação (OFs), peças, estoque, produção, expedição e muito mais.

## Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Estado:** TanStack React Query v5
- **Roteamento:** React Router DOM v6
- **PDF:** jsPDF + html2canvas
- **Gráficos:** Recharts
- **Drag & Drop:** react-beautiful-dnd

## Módulos do Sistema

- **Dashboard** — Visão geral e KPIs
- **Cadastro de OFs** — Ordens de Fabricação com peças e processos
- **Cadastro de Peças** — Biblioteca de peças e componentes
- **Estoque** — Controle de materiais e movimentações
- **Produção** — Apontamentos, diário e painel industrial
- **Expedição** — Romaneios e entregas
- **Obras** — Gestão de projetos e instalações
- **Tarefas** — Gestão de tarefas e atribuições
- **Biblioteca** — Normas, catálogos e referências técnicas
- **Admin** — Gestão de usuários e permissões

## Configuração Local

### Pré-requisitos

- Node.js >= 20
- npm >= 10

### Instalação

```sh
# 1. Clone o repositório
git clone <URL_DO_REPO>
cd tracksteel-app

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente Obrigatórias

```env
VITE_SUPABASE_PROJECT_ID=seu_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key
VITE_SUPABASE_URL=https://seu_project_id.supabase.co
```

## Deploy (Coolify + VPS)

O projeto utiliza Docker para deploy via Coolify:

```sh
# Build da imagem
docker build -t tracksteel-app .

# Executar localmente
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=... \
  tracksteel-app
```

## Scripts Disponíveis

```sh
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run lint       # Verificação de código
npm run preview    # Preview do build
```
 - Último teste de deploy em: Wed Mar 18 17:28:14 UTC 2026
