package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	_ "rest-api-in-gin/docs"
	"rest-api-in-gin/internal/database"
	"rest-api-in-gin/internal/env"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/joho/godotenv/autoload"
)

// @title Go Gin Rest API
// @version 1.0
// @description A rest API in Go using Gin framework
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter your bearer token in the format **Bearer &lt;token&gt;**

type application struct {
	port      int
	jwtSecret string
	uploadDir string
	models    database.Models
}

func main() {
	dsn := env.GetEnvString("DATABASE_URL", "")
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := runMigrations(db); err != nil {
		log.Fatal(err)
	}

	models := database.NewModels(db)
	uploadDir := env.GetEnvString("UPLOAD_DIR", "./tmp/uploads")
	if err := ensureDir(uploadDir); err != nil {
		log.Fatal(err)
	}
	app := &application{
		port:      env.GetEnvInt("PORT", 8080),
		jwtSecret: env.GetEnvString("JWT_SECRET", "some-secret-123456"),
		uploadDir: uploadDir,
		models:    models,
	}

	if err := app.serve(); err != nil {
		log.Fatal(err)
	}
}

func ensureDir(path string) error {
	if path == "" || path == "." {
		return nil
	}
	return os.MkdirAll(path, 0o755)
}

func runMigrations(db *sql.DB) error {
	migrationsDir := env.GetEnvString("MIGRATIONS_DIR", "cmd/migrate/migrations")
	sourceURL := fmt.Sprintf("file://%s", migrationsDir)

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithDatabaseInstance(sourceURL, "postgres", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	return nil
}
