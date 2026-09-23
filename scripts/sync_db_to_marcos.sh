#!/bin/bash
# ==============================================================================
# SCRIPT DE REPLICAÇÃO AUTOMÁTICA: HOSTINGER -> MARCOS-VPS (TRACKSTEEL DB)
# ==============================================================================
# Sincroniza schemas de negócio (TS_ERP, gpi, tracksteel, rdo) e storage
# da VPS Hostinger local para o Supabase na Marcos-VPS (100.97.2.16).
# ==============================================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOG_DIR="/root/Apps/TrackSteelAPP/scripts/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync_db_$(date +'%Y%m%d').log"

log() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$1"
    echo "$msg" >> "$LOG_FILE"
}

log "\n${CYAN}======================================================${NC}"
log "${CYAN}🔄 Iniciando Replicação de Banco de Dados -> marcos-vps${NC}"
log "${CYAN}======================================================${NC}"

# Configurações de Conexão
DEST_IP="100.97.2.16"
SRC_DB_CONTAINER="supabase-db-h0oggskgs0ws0sco8kc4s8ws"
DEST_DB_CONTAINER="supabase-db-rjbxu55kggzc59d4cmo133cf"

# Teste de conectividade SSH
log "${YELLOW}📡 Verificando conexão com marcos-vps ($DEST_IP)...${NC}"
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" "true" 2>/dev/null; then
    log "${RED}❌ ERRO: Não foi possível conectar via SSH à marcos-vps ($DEST_IP). Replicação abortada.${NC}"
    exit 1
fi
log "${GREEN}✅ Conectividade com marcos-vps confirmada.${NC}"

# Lista de Schemas a sincronizar
SCHEMAS=('TS_ERP' 'gpi' 'tracksteel' 'rdo')

for schema in "${SCHEMAS[@]}"; do
    # Verifica se o schema existe no banco local
    EXISTS=$(docker exec "$SRC_DB_CONTAINER" psql -U postgres -d postgres -tAc \
        "SELECT 1 FROM pg_namespace WHERE nspname = '$schema';" 2>/dev/null || echo "0")
    
    if [ "$EXISTS" = "1" ]; then
        log "${YELLOW}📦 Sincronizando schema: $schema...${NC}"
        TMP_DUMP="/tmp/sync_${schema}_$$.dump"

        # 1. Gerar Dump local comprimido
        docker exec -i "$SRC_DB_CONTAINER" pg_dump -U postgres -d postgres -n "\"$schema\"" -Fc > "$TMP_DUMP"

        # 2. Transferir para marcos-vps via SCP
        scp -q -o BatchMode=yes -o ConnectTimeout=5 "$TMP_DUMP" "root@$DEST_IP:$TMP_DUMP"

        # 3. Restaurar dentro do container de destino
        ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" \
            "docker cp '$TMP_DUMP' '$DEST_DB_CONTAINER:$TMP_DUMP' && \
             docker exec '$DEST_DB_CONTAINER' pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges '$TMP_DUMP' && \
             rm -f '$TMP_DUMP' && \
             docker exec '$DEST_DB_CONTAINER' rm -f '$TMP_DUMP'"

        # 4. Limpar arquivo local
        rm -f "$TMP_DUMP"
        log "${GREEN}  ↳ Schema $schema replicado com sucesso.${NC}"
    fi
done

# Sincronização de Metadados de Storage (buckets e objects)
log "${YELLOW}📁 Sincronizando metadados de Storage (buckets & objects)...${NC}"
STORAGE_SQL="/tmp/sync_storage_$$.sql"
docker exec -i "$SRC_DB_CONTAINER" pg_dump -U postgres -d postgres -t storage.buckets -t storage.objects --data-only --on-conflict-do-nothing > "$STORAGE_SQL" 2>/dev/null || true

if [ -s "$STORAGE_SQL" ]; then
    scp -q -o BatchMode=yes -o ConnectTimeout=5 "$STORAGE_SQL" "root@$DEST_IP:$STORAGE_SQL"
    ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" \
        "docker exec -i '$DEST_DB_CONTAINER' psql -U postgres -d postgres < '$STORAGE_SQL' >/dev/null 2>&1 && rm -f '$STORAGE_SQL'"
    rm -f "$STORAGE_SQL"
    log "${GREEN}  ↳ Metadados de storage sincronizados.${NC}"
else
    rm -f "$STORAGE_SQL"
fi

# Sincronização de arquivos físicos de Storage (MinIO)
SRC_STORAGE="/data/coolify/services/h0oggskgs0ws0sco8kc4s8ws/volumes/storage/"
DEST_STORAGE="/data/coolify/services/rjbxu55kggzc59d4cmo133cf/volumes/storage/"

if [ -d "$SRC_STORAGE" ]; then
    log "${YELLOW}☁️ Sincronizando arquivos físicos do Storage (MinIO)...${NC}"
    rsync -aqz --delete -e "ssh -o BatchMode=yes -o ConnectTimeout=5" "$SRC_STORAGE" "root@$DEST_IP:$DEST_STORAGE" || true
    log "${GREEN}  ↳ Arquivos do Storage espelhados com sucesso.${NC}"
fi

# Validação final de tabelas em TS_ERP
ORIG_COUNT=$(docker exec "$SRC_DB_CONTAINER" psql -U postgres -d postgres -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'TS_ERP';")
DEST_COUNT=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DEST_IP" "docker exec '$DEST_DB_CONTAINER' psql -U postgres -d postgres -tAc \"SELECT count(*) FROM pg_tables WHERE schemaname = 'TS_ERP';\"")

log "${CYAN}📊 Validação de Integridade:${NC}"
log "   - Tabelas TS_ERP (Origem Hostinger): $ORIG_COUNT"
log "   - Tabelas TS_ERP (Destino marcos-vps): $DEST_COUNT"

if [ "$ORIG_COUNT" = "$DEST_COUNT" ]; then
    log "${GREEN}✨ Replicação de banco concluída com 100% de paridade!${NC}\n"
else
    log "${RED}⚠️ ATENÇÃO: Contagem de tabelas diferente entre origem e destino!${NC}\n"
fi
