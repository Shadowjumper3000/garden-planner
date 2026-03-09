package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// Connect opens and pings a PostgreSQL connection using env vars.
func Connect() (*sql.DB, error) {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = os.Getenv("POSTGRES_HOST")
	}
	if host == "" {
		host = "db"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = os.Getenv("POSTGRES_USER")
	}
	if user == "" {
		user = "garden"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = os.Getenv("POSTGRES_PASSWORD")
	}
	if password == "" {
		password = "garden"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = os.Getenv("POSTGRES_DB")
	}
	if dbname == "" {
		dbname = "garden"
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("cannot reach database: %w", err)
	}
	return db, nil
}
