# ============================================================
# TrackSteel App — Dockerfile Multi-Stage
# Stage 1: Build (Node.js) → Stage 2: Serve (Nginx Alpine)
# ============================================================

# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar apenas package files primeiro (para cache de dependências)
COPY package.json package-lock.json ./

# Instalar dependências (usando legacy-peer-deps para resolver conflitos de versões de peer dependencies)
RUN npm install --legacy-peer-deps

# Copiar código-fonte
COPY . .

# Variáveis de ambiente para o build (injetadas pelo Coolify)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ARG VITE_LOGTO_REDIRECT_URI
ARG VITE_LOGTO_POST_LOGOUT_REDIRECT_URI

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_LOGTO_ENDPOINT=$VITE_LOGTO_ENDPOINT
ENV VITE_LOGTO_APP_ID=$VITE_LOGTO_APP_ID
ENV VITE_LOGTO_REDIRECT_URI=$VITE_LOGTO_REDIRECT_URI
ENV VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=$VITE_LOGTO_POST_LOGOUT_REDIRECT_URI

# Build de produção
RUN npm run build

# --- STAGE 2: SERVE ---
FROM nginx:alpine AS production

# Remover config padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build estático do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Iniciar Nginx em foreground
CMD ["nginx", "-g", "daemon off;"]
