package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"garden-planner/internal/middleware"
)

type notificationOut struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"`
	Title       string  `json:"title"`
	Body        string  `json:"body"`
	GardenID    *string `json:"gardenId"`
	PlantID     *string `json:"plantId"`
	ScheduledAt *string `json:"scheduledAt"`
	ReadAt      *string `json:"readAt"`
	CreatedAt   string  `json:"createdAt"`
}

// ListNotifications returns notifications for the current user.
func ListNotifications(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		unreadOnly := r.URL.Query().Get("unread") == "true"
		limit := 50
		if l := r.URL.Query().Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil {
				limit = n
			}
		}

		query := `
			SELECT id::text, type, title, body,
				garden_id::text, plant_id::text,
				scheduled_at::text, read_at::text, created_at::text
			FROM notifications WHERE user_id=$1`
		if unreadOnly {
			query += ` AND read_at IS NULL`
		}
		query += ` ORDER BY created_at DESC LIMIT $2`

		rows, err := db.Query(query, uid, limit)
		if err != nil {
			respondJSON(w, http.StatusOK, []notificationOut{})
			return
		}
		defer rows.Close()

		var result []notificationOut
		for rows.Next() {
			var n notificationOut
			var gardenID, plantID, scheduledAt, readAt sql.NullString
			rows.Scan(
				&n.ID, &n.Type, &n.Title, &n.Body,
				&gardenID, &plantID, &scheduledAt, &readAt, &n.CreatedAt,
			)
			if gardenID.Valid {
				n.GardenID = &gardenID.String
			}
			if plantID.Valid {
				n.PlantID = &plantID.String
			}
			if scheduledAt.Valid {
				n.ScheduledAt = &scheduledAt.String
			}
			if readAt.Valid {
				n.ReadAt = &readAt.String
			}
			result = append(result, n)
		}
		if result == nil {
			result = []notificationOut{}
		}
		respondJSON(w, http.StatusOK, result)
	}
}

// MarkNotificationRead marks a single notification as read.
func MarkNotificationRead(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")
		db.Exec(`UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 AND read_at IS NULL`, id, uid)
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// MarkAllNotificationsRead marks all unread notifications as read.
func MarkAllNotificationsRead(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		db.Exec(`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`, uid)
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// DeleteNotification removes a notification.
func DeleteNotification(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")
		db.Exec(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, id, uid)
		w.WriteHeader(http.StatusNoContent)
	}
}
