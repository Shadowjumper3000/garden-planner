FROM golang:1.21-alpine AS builder
WORKDIR /app

# Install build tools
RUN apk add --no-cache git

# Copy dependency files first for layer caching
COPY go.mod go.sum* ./
RUN go mod download || go mod tidy

# Copy source and build
COPY . .
RUN go mod tidy && go build -o server ./...

FROM alpine:latest
RUN apk add --no-cache wget ca-certificates
WORKDIR /app
COPY --from=builder /app/server ./server
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["./server"]
