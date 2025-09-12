package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"github.com/shadowjumper3000/garden_planner/backend/config"
	"github.com/shadowjumper3000/garden_planner/backend/internal/database"
	"github.com/shadowjumper3000/garden_planner/backend/internal/handlers"
	"github.com/shadowjumper3000/garden_planner/backend/internal/middleware"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services/metrics"
)

type productionLogger struct{}

func (p *productionLogger) Write(data []byte) (int, error) {
	// Convert to string for easier handling
	logMessage := string(data)
	
	// Allow important logs like server status, admin user creation, etc.
	// But filter out potentially sensitive information
	if strings.Contains(logMessage, "Server starting") ||
	   strings.Contains(logMessage, "Shutting down") ||
	   strings.Contains(logMessage, "Admin user created") ||
	   strings.Contains(logMessage, "Database seed") ||
	   strings.Contains(logMessage, "migrations") {
		
		// Filter out password if present in the log
		sanitizedLog := regexp.MustCompile(`Password: [^,\s]+`).
			ReplaceAllString(logMessage, "Password: [REDACTED]")
		
		// Write to stdout
		fmt.Print(sanitizedLog)
	}
	
	return len(data), nil
}

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Set Gin mode based on environment
	isProduction := os.Getenv("GIN_MODE") == "release" || os.Getenv("NODE_ENV") == "production"
	if isProduction {
		gin.SetMode(gin.ReleaseMode)
		// In production, don't log detailed information about seed data
		log.SetOutput(&productionLogger{})
	}

	// Connect to database
	   dbConfig := &database.Config{
		   Host:     cfg.Database.Host,
		   Port:     cfg.Database.Port,
		   User:     cfg.Database.User,
		   Password: cfg.Database.Password,
		   DBName:   cfg.Database.DBName,
	   }

	db, err := database.NewConnection(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.MigrateDB(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed initial data if needed
	if err := database.SeedDB(db); err != nil {
		if isProduction {
			log.Printf("Database seed operation completed")
		} else {
			log.Printf("Failed to seed database: %v", err)
		}
	}

	// Initialize services
	soilCalculator := &services.SoilCalculator{DB: db}
	metricsService := metrics.NewMetricsService(db)

	// Initialize handlers
	authHandler := &handlers.AuthHandler{DB: db, Config: cfg, MetricsService: metricsService}
	gardenHandler := &handlers.GardenHandler{DB: db, SoilCalculator: soilCalculator}
	plantHandler := &handlers.PlantHandler{DB: db}
	adminHandler := &handlers.AdminHandler{DB: db, MetricsService: metricsService}

	// Set up Gin router
	router := gin.Default()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	
	// In production, be more restrictive with CORS
	if os.Getenv("NODE_ENV") == "production" {
		// Only allow origins specified in config
		corsConfig.AllowOrigins = cfg.CORS.AllowOrigins
	} else {
		// In development, allow localhost origins
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"}
	}
	
	corsConfig.AllowCredentials = cfg.CORS.AllowCredentials
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(corsConfig))

	// Auth middleware
	authMiddleware := middleware.AuthMiddleware(&cfg.JWT)

	// Admin middleware
	adminMiddleware := middleware.AdminMiddleware()

	// Public routes
	public := router.Group("/api")
	{
		// Auth routes
		public.POST("/auth/register", authHandler.Register)
		public.POST("/auth/login", authHandler.Login)

		// Public plant routes
		public.GET("/plants", plantHandler.GetAllPlants)
		public.GET("/plants/:id", plantHandler.GetPlantByID)
	}

	// Protected routes
	protected := router.Group("/api")
	protected.Use(authMiddleware)
	{
		// Current user
		protected.GET("/user", authHandler.GetCurrentUser)

		// Garden routes
		protected.GET("/gardens", gardenHandler.GetAllGardens)
		protected.POST("/gardens", gardenHandler.CreateGarden)
		protected.GET("/gardens/:id", gardenHandler.GetGardenByID)
		protected.POST("/gardens/:id/plants", gardenHandler.AddPlant)
		protected.DELETE("/gardens/:id/plants", gardenHandler.RemovePlant)
		protected.GET("/gardens/:id/soil", gardenHandler.GetSoilData)
		protected.GET("/gardens/:id/future-soil", gardenHandler.GetFutureSoil)

		 // Plant routes with ownership controls
		protected.POST("/plants", plantHandler.CreatePlant)
		protected.PUT("/plants/:id", plantHandler.UpdatePlant)       // Will check creator ownership
		protected.DELETE("/plants/:id", plantHandler.DeletePlant)    // Will check creator ownership
		protected.POST("/plants/:id/copy", plantHandler.CopyPlant)   // Anyone can copy a plant
		protected.GET("/plants/my-plants", plantHandler.GetMyPlants) // Get user's created plants
		protected.GET("/plants/recent", plantHandler.GetRecentPlants) // Get recently used plants
		protected.GET("/plants/shared", plantHandler.GetSharedPlants) // Get plants created by others
	}

	// Admin routes (protected by both auth and admin middleware)
	admin := router.Group("/api/admin")
	admin.Use(authMiddleware, adminMiddleware)
	{
		// Metrics and stats
		admin.GET("/metrics", adminHandler.GetMetrics)
		admin.GET("/metrics/daily", adminHandler.GetDailyMetrics)
		admin.GET("/metrics/system", adminHandler.GetSystemStats)
		admin.POST("/metrics/generate", adminHandler.TriggerDailyMetricsGeneration)
		
		// User management
		admin.GET("/users", adminHandler.GetUsers)
		admin.GET("/activities", adminHandler.GetUserActivities)
		admin.PUT("/users/:id/role", adminHandler.SetUserRole)
		
		// Advanced plant management (potentially add more admin-only plant operations here)
		admin.POST("/plants", plantHandler.CreatePlant)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().Format(time.RFC3339)})
	})

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Initialize cron job for metrics
	c := cron.New()
	_, err = c.AddFunc("@daily", func() {
		if err := metricsService.GenerateDailyMetrics(); err != nil {
			log.Printf("Failed to generate daily metrics: %v", err)
		}
	})
	if err != nil {
		log.Fatalf("Failed to schedule cron job: %v", err)
	}
	c.Start()

	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Stop cron job
	c.Stop()

	log.Println("Server exiting")
}