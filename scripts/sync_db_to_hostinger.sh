#!/bin/bash
# ==============================================================================
# SCRIPT DE REPLICAÇÃO REVERSA: MARCOS-VPS (PROD) -> HOSTINGER (BACKUP/RÉPLICA)
# ==============================================================================
# Sincroniza schemas de negócio (TS_ERP, gpi, tracksteel, rdo) e storage
# da VPS Local (marcos-vps) para o Supabase na Hostinger (100.106.199.108 / 187.77.227.172).
# ==============================================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOG_DIR="/root/Apps/TracksteelApp/scripts/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync_db_to_hostinger_$(date +'%Y%m%d').log"

log() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$1"
    echo -e "$msg" >> "$LOG_FILE"
}

log "\n${CYAN}======================================================${NC}"
log "${CYAN}🔄 Iniciando Replicação Reversa: marcos-vps -> Hostinger${NC}"
log "${CYAN}======================================================${NC}"

# Containers
SRC_DB_CONTAINER="supabase-db-rjbxu55kggzc59d4cmo133cf"
DEST_DB_CONTAINER="supabase-db-h0oggskgs0ws0sco8kc4s8ws"

# Determinar IP de Conexão com a Hostinger (preferência Tailscale, fallback IP público)
DEST_IP="100.106.199.108"
log "${YELLOW}📡 Testando conexão SSH com Hostinger via Tailscale ($DEST_IP)...${NC}"

if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" "true" 2>/dev/null; then
    log "${YELLOW}⚠️ Tailscale inacessível. Tentando IP público Hostinger (187.77.227.172)...${NC}"
    DEST_IP="187.77.227.172"
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" "true" 2>/dev/null; then
        log "${RED}❌ ERRO: Não foi possível conectar via SSH à Hostinger ($DEST_IP). Replicação abortada.${NC}"
        exit 1
    fi
fi
log "${GREEN}✅ Conectividade com Hostinger confirmada ($DEST_IP).${NC}"

# Lista de Schemas a sincronizar
SCHEMAS=('TS_ERP' 'gpi' 'tracksteel' 'rdo')

for schema in "${SCHEMAS[@]}"; do
    EXISTS=$(docker exec "$SRC_DB_CONTAINER" psql -U postgres -d postgres -tAc \
        "SELECT 1 FROM pg_namespace WHERE nspname = '$schema';" 2>/dev/null || echo "0")
    
    if [ "$EXISTS" = "1" ]; then
        log "${YELLOW}📦 Sincronizando schema: $schema...${NC}"
        TMP_DUMP="/tmp/sync_rev_${schema}_$$.dump"

        # 1. Gerar Dump local comprimido (marcos-vps)
        docker exec -i "$SRC_DB_CONTAINER" pg_dump -U postgres -d postgres -n "\"$schema\"" -Fc > "$TMP_DUMP"

        # 2. Transferir para Hostinger via SCP
        scp -q -o BatchMode=yes -o ConnectTimeout=5 "$TMP_DUMP" "root@$DEST_IP:$TMP_DUMP"

        # 3. Restaurar na Hostinger e restabelecer permissões
        ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" \
            "docker cp '$TMP_DUMP' '$DEST_DB_CONTAINER:$TMP_DUMP' && \
             (docker exec '$DEST_DB_CONTAINER' pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges '$TMP_DUMP' || true) && \
             docker exec '$DEST_DB_CONTAINER' psql -U postgres -d postgres -c \"GRANT USAGE ON SCHEMA \\\"$schema\\\" TO anon, authenticated, service_role, authenticator; GRANT ALL ON ALL TABLES IN SCHEMA \\\"$schema\\\" TO anon, authenticated, service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA \\\"$schema\\\" TO anon, authenticated, service_role; GRANT ALL ON ALL ROUTINES IN SCHEMA \\\"$schema\\\" TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA \\\"$schema\\\" GRANT ALL ON TABLES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA \\\"$schema\\\" GRANT ALL ON SEQUENCES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA \\\"$schema\\\" GRANT ALL ON ROUTINES TO anon, authenticated, service_role; NOTIFY pgrst, 'reload schema';\" && \
             rm -f '$TMP_DUMP' && \
             docker exec '$DEST_DB_CONTAINER' rm -f '$TMP_DUMP'"

        # 4. Limpar dump local
        rm -f "$TMP_DUMP"
        log "${GREEN}  ↳ Schema $schema replicado na Hostinger com sucesso.${NC}"
    fi
done

# Sincronização de Metadados de Storage (buckets e objects)
log "${YELLOW}📁 Sincronizando metadados de Storage (buckets & objects)...${NC}"
STORAGE_SQL="/tmp/sync_storage_rev_$$.sql"
docker exec -i "$SRC_DB_CONTAINER" pg_dump -U postgres -d postgres -t storage.buckets -t storage.objects --data-only --on-conflict-do-nothing > "$STORAGE_SQL" 2>/dev/null || true

if [ -s "$STORAGE_SQL" ]; then
    scp -q -o BatchMode=yes -o ConnectTimeout=5 "$STORAGE_SQL" "root@$DEST_IP:$STORAGE_SQL"
    ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" \
        "docker exec -i '$DEST_DB_CONTAINER' psql -U postgres -d postgres < '$STORAGE_SQL' >/dev/null 2>&1 && rm -f '$STORAGE_SQL'"
    rm -f "$STORAGE_SQL"
    log "${GREEN}  ↳ Metadados de storage sincronizados na Hostinger.${NC}"
else
    rm -f "$STORAGE_SQL"
fi

# Sincronização de arquivos físicos de Storage (MinIO)
SRC_STORAGE="/data/coolify/services/rjbxu55kggzc59d4cmo133cf/volumes/storage/"
DEST_STORAGE="/data/coolify/services/h0oggskgs0ws0sco8kc4s8ws/volumes/storage/"

if [ -d "$SRC_STORAGE" ]; then
    log "${YELLOW}☁️ Sincronizando arquivos físicos do Storage para a Hostinger...${NC}"
    rsync -aqz --delete -e "ssh -o BatchMode=yes -o ConnectTimeout=5" "$SRC_STORAGE" "root@$DEST_IP:$DEST_STORAGE" || true
    log "${GREEN}  ↳ Arquivos do Storage espelhados com sucesso na Hostinger.${NC}"
fi

# Validação final de integridade de tabelas em TS_ERP
ORIG_COUNT=$(docker exec "$SRC_DB_CONTAINER" psql -U postgres -d postgres -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'TS_ERP';" 2>/dev/null || echo "0")
DEST_COUNT=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" "docker exec '$DEST_DB_CONTAINER' psql -U postgres -d postgres -tAc \"SELECT count(*) FROM pg_tables WHERE schemaname = 'TS_ERP';\"" 2>/dev/null || echo "0")

log "${CYAN}📊 Validação de Integridade:${NC}"
log "   - Tabelas TS_ERP (Origem marcos-vps): $ORIG_COUNT"
log "   - Tabelas TS_ERP (Destino Hostinger): $DEST_COUNT"

if [ "$ORIG_COUNT" = "$DEST_COUNT" ] && [ "$ORIG_COUNT" != "0" ]; then
    log "${GREEN}✨ Replicação reversa concluída com 100% de paridade!${NC}\n"
else
    log "${YELLOW}⚠️ Aviso: Contagem de tabelas ($ORIG_COUNT vs $DEST_COUNT). Verifique os logs.${NC}\n"
fi
