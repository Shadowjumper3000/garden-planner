# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy rate limiting config into http context of main nginx.conf
COPY rate_limiting.conf /etc/nginx/conf.d/rate_limiting.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add include directive for rate limiting config to main nginx.conf
RUN sed -i '1i include /etc/nginx/conf.d/rate_limiting.conf;' /etc/nginx/nginx.conf

# Copy SSL directory (will be populated by volume mount in production)
RUN mkdir -p /etc/nginx/ssl

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/health || exit 1

# Expose HTTP and HTTPS ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]