package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/crypto/bcrypt"

	"garden-planner/internal/database"
	"garden-planner/internal/handlers"
	"garden-planner/internal/middleware"
	"garden-planner/internal/services"
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

	// Bootstrap admin user from environment secrets (idempotent)
	if err := bootstrapAdmin(db); err != nil {
		log.Printf("Warning: could not bootstrap admin user: %v", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev_jwt_secret_not_for_production"
		log.Println("WARNING: JWT_SECRET not set — using insecure default")
	}

	// Start notification scheduler
	notifSvc := services.NewNotificationService(db)
	sched := services.NewScheduler(notifSvc)
	sched.Start()
	defer sched.Stop()

	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   getAllowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health — no auth, used by rolling-deploy readiness probe
	r.Get("/healthz", handlers.HealthCheck(db))
	r.Get("/health", handlers.HealthCheck(db))

	// Auth (public)
	r.Post("/api/auth/register", handlers.Register(db, jwtSecret))
	r.Post("/api/auth/login", handlers.Login(db, jwtSecret))

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWT(jwtSecret))

		// Gardens
		r.Get("/api/gardens", handlers.ListGardens(db))
		r.Post("/api/gardens", handlers.CreateGarden(db))
		r.Get("/api/gardens/{id}", handlers.GetGarden(db))
		r.Put("/api/gardens/{id}", handlers.UpdateGarden(db))
		r.Delete("/api/gardens/{id}", handlers.DeleteGarden(db))

		// Soil
		r.Patch("/api/gardens/{id}/soil", handlers.UpdateSoil(db))
		r.Get("/api/gardens/{id}/soil/history", handlers.GetSoilHistory(db))

		// Plant placements
		r.Post("/api/gardens/{id}/plants", handlers.AddPlantToGarden(db))
		r.Delete("/api/gardens/{id}/plants", handlers.RemovePlantFromGarden(db))

		// Plant library
		r.Get("/api/plants", handlers.ListPlants(db))
		r.Post("/api/plants", handlers.CreatePlant(db))
		r.Get("/api/plants/my-plants", handlers.ListMyPlants(db))
		r.Get("/api/plants/recent", handlers.ListRecentPlants(db))
		r.Get("/api/plants/shared", handlers.ListSharedPlants(db))
		r.Get("/api/plants/{id}", handlers.GetPlant(db))
		r.Put("/api/plants/{id}", handlers.UpdatePlant(db))
		r.Delete("/api/plants/{id}", handlers.DeletePlant(db))
		r.Post("/api/plants/{id}/copy", handlers.CopyPlant(db))

		// Plant companion relationships
		r.Get("/api/plants/{id}/relationships", handlers.GetPlantRelationships(db))
		r.Post("/api/plants/relationships", handlers.UpsertRelationship(db))

		// Notifications
		r.Get("/api/notifications", handlers.ListNotifications(db))
		r.Patch("/api/notifications/{id}/read", handlers.MarkNotificationRead(db))
		r.Patch("/api/notifications/read-all", handlers.MarkAllNotificationsRead(db))
		r.Delete("/api/notifications/{id}", handlers.DeleteNotification(db))

		// Admin — requires admin role
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAdmin)
			r.Get("/api/admin/users", handlers.AdminListUsers(db))
			r.Post("/api/admin/users", handlers.AdminCreateUser(db))
			r.Put("/api/admin/users/{id}/role", handlers.AdminSetUserRole(db))
			r.Patch("/api/admin/users/{id}/password", handlers.AdminResetUserPassword(db))
			r.Delete("/api/admin/users/{id}", handlers.AdminDeleteUser(db))
			r.Get("/api/admin/activities", handlers.AdminListActivities(db))
			r.Get("/api/admin/metrics", handlers.AdminGetMetrics(db))
			r.Get("/api/admin/metrics/daily", handlers.AdminGetDailyMetrics(db))
			r.Get("/api/admin/metrics/system", handlers.AdminGetSystemStats(db))
			r.Post("/api/admin/metrics/generate", handlers.AdminGenerateMetrics(db))
		})
	})

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Garden Planner API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// bootstrapAdmin creates the initial admin account from ADMIN_EMAIL /
// ADMIN_PASSWORD / ADMIN_NAME env vars if those are set and no admin exists yet.
// This is idempotent: re-running on restart is safe.
func bootstrapAdmin(db *sql.DB) error {
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return nil // nothing to do
	}
	name := os.Getenv("ADMIN_NAME")
	if name == "" {
		name = "Admin"
	}

	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)`, email).Scan(&exists); err != nil {
		return err
	}
	if exists {
		// Ensure role is admin in case it was downgraded accidentally
		_, err := db.Exec(`UPDATE users SET role='admin' WHERE email=$1`, email)
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		`INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1,$2,$3,'admin',now())`,
		name, email, string(hash),
	)
	if err != nil {
		return err
	}
	log.Printf("Admin user bootstrapped: %s", email)
	return nil
}

func getAllowedOrigins() []string {
	raw := os.Getenv("CORS_ALLOW_ORIGINS")
	if raw == "" {
		return []string{"http://localhost", "http://localhost:5173", "http://localhost:8000"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
