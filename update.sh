#!/bin/bash
# ---------------------------------------------------------
# TRACKSTEEL APP: DEPLOY E SINCRONIZAÇÃO
# ---------------------------------------------------------

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${CYAN}🚀 Iniciando Ciclo Automático de Deploy TrackSteelAPP...${NC}"

echo -e "${YELLOW}📝 Sincronizando código...${NC}"
git add .

if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✨ Nenhuma nova alteração para comitar.${NC}"
else
    TIMESTAMP=$(date +"%d/%m/%Y %H:%M:%S")
    MSG="${1:-🚀 Auto-deploy: TrackSteelAPP atualizado em $TIMESTAMP}"
    echo -e "${CYAN}📤 Criando novo commit: $MSG${NC}"
    git commit -m "$MSG"
fi

echo -e "${CYAN}📤 Sincronizando com o repositório remoto (git push)...${NC}"
git push

echo -e "${YELLOW}🔄 Disparando Deploy via API Oficial no Coolify...${NC}"
COOLIFY_TOKEN="19|ZJKUbBgyeNGcKrVkMI5gJ1uMHDC39d9VIShHL473a60d9882"
TRACKSTEEL_UUID="i8o44gggg00o88ccc8oo48kk"
curl -s -X GET "https://painel.reifonas.cloud/api/v1/deploy?uuid=${TRACKSTEEL_UUID}&force=false" \
     -H "Authorization: Bearer $COOLIFY_TOKEN"

echo -e "\n${GREEN}🚀 Deploy oficial via API engatilhado com sucesso!${NC}"
echo -e "${GREEN}🏁 Ciclo concluído com sucesso.${NC}\n"
