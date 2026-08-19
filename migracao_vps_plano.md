# Migração do TrackSteelAPP para a Marcos-VPS

Este plano descreve o processo passo a passo para migrar completamente a infraestrutura (Banco de Dados Supabase, Logto, e o Front-End) da Hostinger para a nova VPS (marcos-vps), além de replicar o repositório atual para o GitHub.

> [!IMPORTANT]
> A migração foi desenhada para NÃO afetar ou modificar qualquer componente rodando atualmente na VPS da Hostinger, garantindo que a aplicação atual continue funcionando sem instabilidades durante o processo.

## Open Questions

Antes de iniciarmos a execução do plano, preciso de algumas confirmações:

1. **Banco de Dados (Supabase)**: O Coolify da Hostinger roda um Supabase completo (com meta, db, rest, etc). Você gostaria de replicar o Supabase inteiro na marcos-vps via Coolify, ou apenas o container do PostgreSQL (supabase-db)? (O recomendado é replicar a stack inteira para manter 100% de compatibilidade se você usa os recursos do Supabase).
2. **Novo Repositório no GitHub**: Farei um git clone --mirror do Gitea e um git push --mirror para o novo GitHub, preservando todo o histórico. Devo configurar a marcos-vps para fazer os deployments a partir do novo repositório no GitHub?

## Proposed Changes

### 1. Migração de Repositório (Gitea -> GitHub)
- Fazer clone completo (mirror) do repositório atual do Gitea.
- Adicionar o remote do GitHub (https://github.com/admbrainsteel/TracksteelApp.git) usando o token fornecido.
- Enviar todo o histórico (push --mirror) para o GitHub.
- Alterar o remote do repositório local na VPS para o GitHub (ou mantê-lo duplo para a Hostinger).

### 2. Migração de Banco de Dados e Logto (Hostinger -> marcos-vps)

**Extração (Hostinger):**
- Fazer dump completo dos dados do PostgreSQL (supabase-db) utilizando pg_dumpall ou pg_dump.
- Fazer dump do banco de dados do Logto (container postgres-ea4tt75aeibqtu19hjqqw12f).
- Coletar as variáveis de ambiente, chaves e senhas dos containers no Coolify atual.

**Provisionamento (marcos-vps):**
- Acessar a marcos-vps (Tailscale IP: 100.97.2.16).
- Através da CLI do Coolify ou API, recriar os serviços: Supabase Stack e Logto.
- Ajustar as variáveis de ambiente para utilizar a nova URL.

**Restauração (marcos-vps):**
- Importar os dados do Supabase.
- Importar os dados do Logto.

### 3. Deploy do TrackSteelAPP na marcos-vps
- Criar a aplicação TrackSteelAPP no Coolify da marcos-vps.
- Conectar ao repositório do GitHub (com os tokens).
- Configurar o mapeamento de portas da aplicação no Coolify da marcos-vps para expor a porta na máquina host como 8750, atendendo ao requisito do túnel Cloudflare (http://localhost:8750).
- Atualizar o arquivo `.env` para apontar para os novos serviços locais (Logto e Supabase da marcos-vps).

## Verification Plan

### Automated Tests
- Testar conectividade SSH e acesso a banco de dados em ambos os servidores para garantir a integridade dos backups antes de aplicar.

### Manual Verification
- Ao final, solicitarei que você acesse a nova URL https://ts.brainsteel.com.br pelo navegador para validar se a aplicação carrega, o login pelo Logto funciona e os dados antigos do banco de dados estão perfeitamente sincronizados.
