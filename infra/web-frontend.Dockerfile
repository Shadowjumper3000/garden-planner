# ─── Build stage ─────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN bun run build

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
