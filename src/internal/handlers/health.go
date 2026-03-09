package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// HealthCheck returns 200 if the DB is reachable.
func HealthCheck(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"status": "unhealthy", "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}
}
