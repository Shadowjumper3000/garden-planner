package database

import "database/sql"

// DBHandler wraps a sql.DB for convenience.
type DBHandler struct {
	DB *sql.DB
}

// NewHandler creates a DBHandler.
func NewHandler(db *sql.DB) *DBHandler {
	return &DBHandler{DB: db}
}
