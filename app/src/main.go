package main

import (
	"log"
	"net/http"

	"garden-planner/app/backend/internal/database"
)

func main() {
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Starting server on :8080...")
	http.ListenAndServe(":8080", nil)
}
