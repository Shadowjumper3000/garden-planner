package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/shadowjumper3000/garden_planner/backend/config"
	"github.com/shadowjumper3000/garden_planner/backend/internal/database"
	"github.com/shadowjumper3000/garden_planner/backend/internal/handlers"
	"github.com/shadowjumper3000/garden_planner/backend/internal/middleware"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "release" || os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to database
	dbConfig := &database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.DBName,
		SSLMode:  cfg.Database.SSLMode,
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
		log.Printf("Failed to seed database: %v", err)
	}

	// Initialize services
	soilCalculator := &services.SoilCalculator{DB: db}

	// Initialize handlers
	authHandler := &handlers.AuthHandler{DB: db, Config: cfg}
	gardenHandler := &handlers.GardenHandler{DB: db, SoilCalculator: soilCalculator}
	plantHandler := &handlers.PlantHandler{DB: db}

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
		protected.GET("/gardens/:id/soil", gardenHandler.GetSoilData)
		protected.GET("/gardens/:id/future-soil", gardenHandler.GetFutureSoil)

		// Admin plant routes (could be further restricted in production)
		protected.POST("/plants", plantHandler.CreatePlant)
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

	log.Println("Server exiting")
}