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

echo -e "${CYAN}📤 Sincronizando com os repositórios remotos (Gitea e GitHub)...${NC}"
git push origin main

echo -e "\n${YELLOW}🔄 Disparando Deploy via API Oficial no Coolify (Hostinger)...${NC}"
COOLIFY_TOKEN="19|ZJKUbBgyeNGcKrVkMI5gJ1uMHDC39d9VIShHL473a60d9882"
TRACKSTEEL_UUID="i8o44gggg00o88ccc8oo48kk"
curl -s -X GET "https://painel.reifonas.cloud/api/v1/deploy?uuid=${TRACKSTEEL_UUID}&force=false" \
     -H "Authorization: Bearer $COOLIFY_TOKEN"
echo -e "\n${GREEN}🚀 Deploy local (Hostinger) engatilhado com sucesso!${NC}"

echo -e "\n${YELLOW}🌐 Sincronizando código e atualizando app na marcos-vps (100.97.2.16)...${NC}"
ssh -o BatchMode=yes -o ConnectTimeout=5 root@100.97.2.16 \
    "cd /root/Apps/TracksteelApp && git pull origin main && docker restart tracksteel-app" \
    && echo -e "${GREEN}✅ App na marcos-vps atualizado com sucesso!${NC}" \
    || echo -e "${YELLOW}⚠️ Aviso: Falha ao atualizar app na marcos-vps via SSH.${NC}"

echo -e "\n${YELLOW}🗄️ Replicando Banco de Dados e Storage para marcos-vps...${NC}"
if [ -f "/root/Apps/TrackSteelAPP/scripts/sync_db_to_marcos.sh" ]; then
    /root/Apps/TrackSteelAPP/scripts/sync_db_to_marcos.sh
fi

echo -e "\n${GREEN}🏁 Ciclo completo de deploy e replicação concluído com sucesso!${NC}\n"
