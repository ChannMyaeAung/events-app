# syntax=docker/dockerfile:1

FROM golang:1.24 AS builder
WORKDIR /app/backend
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/events-api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/migrate ./cmd/migrate

FROM gcr.io/distroless/base-debian12
WORKDIR /srv
COPY --from=builder /bin/events-api ./events-api
COPY --from=builder /bin/migrate ./migrate
COPY --from=builder /app/backend/docs ./docs
COPY --from=builder /app/backend/cmd/migrate/migrations ./migrations
ENV PORT=8080 \
    DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable \
    UPLOAD_DIR=/tmp/uploads \
    GIN_MODE=release \
    MIGRATIONS_DIR=/srv/migrations
EXPOSE 8080
CMD ["./events-api"]
