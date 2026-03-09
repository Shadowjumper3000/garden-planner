package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

// AdminListUsers returns paginated users.
func AdminListUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
		if page < 1 {
			page = 1
		}
		if pageSize < 1 {
			pageSize = 10
		}
		search := r.URL.Query().Get("search")

		offset := (page - 1) * pageSize
		rows, err := db.Query(`
			SELECT id, name, email, role, created_at::text
			FROM users
			WHERE ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')
			ORDER BY created_at DESC LIMIT $2 OFFSET $3`, search, pageSize, offset)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]any{"users": []any{}, "total": 0, "page": page, "pageSize": pageSize})
			return
		}
		defer rows.Close()

		var users []map[string]any
		for rows.Next() {
			var id int
			var name, email, role, createdAt string
			rows.Scan(&id, &name, &email, &role, &createdAt)
			users = append(users, map[string]any{
				"id": id, "name": name, "email": email, "role": role, "createdAt": createdAt,
				"gardens": []string{},
			})
		}

		var total int
		db.QueryRow(`SELECT COUNT(*) FROM users WHERE ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')`, search).Scan(&total)

		if users == nil {
			users = []map[string]any{}
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"users": users, "total": total, "page": page, "pageSize": pageSize,
		})
	}
}

// AdminSetUserRole sets a user's role.
func AdminSetUserRole(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var req struct {
			Role string `json:"role"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		db.Exec(`UPDATE users SET role=$1 WHERE id=$2`, req.Role, id)
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// AdminListActivities returns activity logs.
func AdminListActivities(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
		if page < 1 {
			page = 1
		}
		if pageSize < 1 {
			pageSize = 10
		}
		offset := (page - 1) * pageSize

		rows, err := db.Query(`
			SELECT al.id, al.user_id, u.name, al.activity_type, al.details, al.created_at::text
			FROM activity_logs al
			LEFT JOIN users u ON u.id=al.user_id
			ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`, pageSize, offset)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]any{"activities": []any{}, "total": 0, "page": page, "pageSize": pageSize})
			return
		}
		defer rows.Close()

		var activities []map[string]any
		for rows.Next() {
			var id, userID int
			var userName, activityType, details, createdAt string
			rows.Scan(&id, &userID, &userName, &activityType, &details, &createdAt)
			activities = append(activities, map[string]any{
				"id": id, "userId": userID, "userName": userName,
				"activityType": activityType, "details": details, "createdAt": createdAt,
			})
		}

		var total int
		db.QueryRow(`SELECT COUNT(*) FROM activity_logs`).Scan(&total)
		if activities == nil {
			activities = []map[string]any{}
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"activities": activities, "total": total, "page": page, "pageSize": pageSize,
		})
	}
}

// AdminGetMetrics returns basic system metrics.
func AdminGetMetrics(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var userCount, gardenCount, plantCount int
		db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&userCount)
		db.QueryRow(`SELECT COUNT(*) FROM gardens`).Scan(&gardenCount)
		db.QueryRow(`SELECT COUNT(*) FROM plants`).Scan(&plantCount)

		respondJSON(w, http.StatusOK, map[string]any{
			"systemStats": []map[string]any{
				{"name": "Total Users", "value": userCount},
				{"name": "Total Gardens", "value": gardenCount},
				{"name": "Total Plants", "value": plantCount},
			},
			"dailyMetrics": []any{},
		})
	}
}

// AdminGetDailyMetrics returns daily metric rows.
func AdminGetDailyMetrics(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
			SELECT DATE(created_at)::text, COUNT(*)
			FROM activity_logs
			WHERE created_at > now() - INTERVAL '30 days'
			GROUP BY DATE(created_at)
			ORDER BY DATE(created_at) DESC`)
		if err != nil {
			respondJSON(w, http.StatusOK, []any{})
			return
		}
		defer rows.Close()
		var result []map[string]any
		for rows.Next() {
			var day string
			var count int
			rows.Scan(&day, &count)
			result = append(result, map[string]any{"date": day, "count": count, "type": "activity"})
		}
		if result == nil {
			result = []map[string]any{}
		}
		respondJSON(w, http.StatusOK, result)
	}
}

// AdminGetSystemStats returns simple system stats.
func AdminGetSystemStats(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var userCount, gardenCount, plantCount int
		db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&userCount)
		db.QueryRow(`SELECT COUNT(*) FROM gardens`).Scan(&gardenCount)
		db.QueryRow(`SELECT COUNT(*) FROM plants`).Scan(&plantCount)
		respondJSON(w, http.StatusOK, []map[string]any{
			{"name": "users", "value": userCount, "label": "Total Users"},
			{"name": "gardens", "value": gardenCount, "label": "Total Gardens"},
			{"name": "plants", "value": plantCount, "label": "Total Plants"},
		})
	}
}

// AdminGenerateMetrics inserts synthetic daily metrics.
func AdminGenerateMetrics(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		db.Exec(`
			INSERT INTO activity_logs (activity_type, details)
			VALUES ('metrics_generated', $1)`, time.Now().Format(time.RFC3339))
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// AdminCreateUser creates a new user account (admin panel).
// Body: { name, email, password, role }
func AdminCreateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if req.Email == "" || req.Password == "" || req.Name == "" {
			http.Error(w, "name, email and password are required", http.StatusBadRequest)
			return
		}
		if req.Role != "admin" {
			req.Role = "user"
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "failed to hash password", http.StatusInternalServerError)
			return
		}

		var id int
		var createdAt string
		err = db.QueryRow(
			`INSERT INTO users (name,email,password_hash,role,created_at)
			 VALUES ($1,$2,$3,$4,now())
			 RETURNING id, created_at::text`,
			req.Name, req.Email, string(hash), req.Role,
		).Scan(&id, &createdAt)
		if err != nil {
			http.Error(w, "email already registered or database error", http.StatusConflict)
			return
		}

		respondJSON(w, http.StatusCreated, map[string]any{
			"id": id, "name": req.Name, "email": req.Email,
			"role": req.Role, "createdAt": createdAt,
		})
	}
}

// AdminDeleteUser permanently deletes a user and all their data.
func AdminDeleteUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		result, err := db.Exec(`DELETE FROM users WHERE id=$1`, id)
		if err != nil {
			http.Error(w, "database error", http.StatusInternalServerError)
			return
		}
		rows, _ := result.RowsAffected()
		if rows == 0 {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// AdminResetUserPassword sets a new password for any user.
// Body: { password }
func AdminResetUserPassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var req struct {
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Password == "" {
			http.Error(w, "password is required", http.StatusBadRequest)
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "failed to hash password", http.StatusInternalServerError)
			return
		}
		result, err := db.Exec(`UPDATE users SET password_hash=$1 WHERE id=$2`, string(hash), id)
		if err != nil {
			http.Error(w, "database error", http.StatusInternalServerError)
			return
		}
		rows, _ := result.RowsAffected()
		if rows == 0 {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
