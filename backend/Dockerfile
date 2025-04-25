FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum files first for better caching
COPY go.mod .
COPY go.sum .

# Download dependencies
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the application with optimization
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o garden-planner-api ./cmd/api

# Use golang image for final stage if you need Go at runtime
FROM golang:1.24-alpine

# Add ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/garden-planner-api .

# Expose the API port
EXPOSE 8080

# Run the API
CMD ["./garden-planner-api"]