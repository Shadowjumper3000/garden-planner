FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

# Copy go.mod and go.sum files first for better caching
COPY go.mod .
COPY go.sum .

# Download dependencies
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the application with optimization
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o garden-planner-api ./cmd/api

# Use distroless for the smallest possible image and improved security
FROM gcr.io/distroless/static:nonroot

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy SSL certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/garden-planner-api .

# Use non-root user for security
USER nonroot:nonroot

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/garden-planner-api", "-health-check"] || exit 1

# Expose the API port
EXPOSE 8080

# Run the API
ENTRYPOINT ["/app/garden-planner-api"]