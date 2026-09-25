#!/bin/bash
# ---------------------------------------------------------
# TRACKSTEEL APP: DEPLOY & SINCRONIZAÇÃO (MARCOS-VPS -> PROD & HOSTINGER)
# ---------------------------------------------------------

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}🚀 Iniciando Ciclo Automático de Deploy TrackSteel APP (marcos-vps)...${NC}"

# 1. Git Commit & Push
echo -e "\n${YELLOW}📝 Sincronizando código com o repositório GitHub...${NC}"
git add .

if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✨ Nenhuma nova alteração para comitar.${NC}"
else
    TIMESTAMP=$(date +"%d/%m/%Y %H:%M:%S")
    MSG="${1:-🚀 Auto-deploy: TrackSteel APP atualizado em $TIMESTAMP}"
    echo -e "${CYAN}📤 Criando novo commit: $MSG${NC}"
    git commit -m "$MSG"
fi

echo -e "${CYAN}📤 Enviando alterações para o GitHub (origin main)...${NC}"
git push origin main

# 2. Build local do Frontend
echo -e "\n${YELLOW}🔨 Executando build de produção local (npm run build)...${NC}"
npm run build

# 3. Reiniciar container do Tracksteel local
echo -e "\n${YELLOW}🔄 Atualizando container local tracksteel-app...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^tracksteel-app$"; then
    docker restart tracksteel-app
    echo -e "${GREEN}✅ Container tracksteel-app reiniciado com sucesso!${NC}"
else
    echo -e "${YELLOW}ℹ️ Container tracksteel-app não encontrado no docker local.${NC}"
fi

# 4. Replicação Reversa de Banco de Dados para a Hostinger
echo -e "\n${YELLOW}🗄️ Executando replicação reversa de BD e Storage para a Hostinger...${NC}"
SCRIPT_SYNC="/root/Apps/TracksteelApp/scripts/sync_db_to_hostinger.sh"
if [ -f "$SCRIPT_SYNC" ]; then
    chmod +x "$SCRIPT_SYNC"
    "$SCRIPT_SYNC" || echo -e "${YELLOW}⚠️ Aviso: A replicação para Hostinger apresentou avisos ou falha de conexão.${NC}"
fi

# 5. Notificar Coolify da Hostinger para deploy de contingência
echo -e "\n${YELLOW}🌐 Atualizando app réplica no Coolify da Hostinger...${NC}"
COOLIFY_TOKEN="19|ZJKUbBgyeNGcKrVkMI5gJ1uMHDC39d9VIShHL473a60d9882"
TRACKSTEEL_UUID="i8o44gggg00o88ccc8oo48kk"
curl -s -X GET "https://painel.reifonas.cloud/api/v1/deploy?uuid=${TRACKSTEEL_UUID}&force=false" \
     -H "Authorization: Bearer $COOLIFY_TOKEN" >/dev/null 2>&1 || true
echo -e "${GREEN}🚀 Deploy da réplica (Hostinger) acionado com sucesso!${NC}"

echo -e "\n${GREEN}🏁 Ciclo de deploy e replicação concluído com sucesso!${NC}\n"
