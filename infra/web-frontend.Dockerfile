# Build stage
FROM node:20-alpine AS build

WORKDIR /app


# Copy only dependency files for better caching
COPY package.json package-lock.json bun.lockb ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage