FROM golang:1.21-alpine as builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o server main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server ./server
EXPOSE 8080
CMD ["./server"]
