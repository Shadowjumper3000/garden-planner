# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:18-bullseye AS build

WORKDIR /app

# Ensure basic build tooling is available for any native deps during npm install
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential python3 make g++ ca-certificates curl \
  libpng-dev libjpeg-dev libwebp-dev libgif-dev libx11-dev pkg-config git \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies using npm. Prefer package-lock if present, fallback to install.
COPY package.json package-lock.json* ./
# Use unsafe-perm to avoid permission issues during install as root
RUN if [ -f package-lock.json ]; then npm ci --silent --unsafe-perm --legacy-peer-deps; else npm install --silent --unsafe-perm --legacy-peer-deps; fi

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
# Ensure production env and allow larger heap for Node during build (reduce OOM failures)
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM nginx:1.26-alpine

WORKDIR /usr/share/nginx/html

# nginx.conf lives in web/ (the build context) so it can be COPY'd directly.
# It proxies /api/ → backend:8080 and /admin/dashboard/ → grafana:3000.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=build /app/dist .

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
