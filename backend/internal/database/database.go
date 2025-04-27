package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Config holds the database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewConnection creates a new database connection
func NewConnection(config *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode,
	)

	// Determine log level based on environment
	logLevel := logger.Info
	if os.Getenv("GIN_MODE") == "release" || os.Getenv("NODE_ENV") == "production" {
		logLevel = logger.Error // Only log errors in production
	}

	// Configure GORM logger
	newLogger := logger.New(
		log.New(log.Writer(), "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  os.Getenv("NODE_ENV") != "production", // No color in production logs
		},
	)

	// Connect to database
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{
		Logger: newLogger,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// MigrateDB runs database migrations
func MigrateDB(db *gorm.DB) error {
	// Auto migrate the schema
	err := db.AutoMigrate(
		&models.User{},
		&models.Plant{},
		&models.Garden{},
		&models.PlantPlacement{},
		&models.GardenEvent{},
		&models.UserActivity{},      // Added for metrics tracking
		&models.MetricDailySummary{}, // Added for daily metrics aggregation
		&models.SystemStat{},        // Added for system statistics
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	return nil
}

// SeedDB seeds the database with initial data if needed
func SeedDB(db *gorm.DB) error {
	// Seed plants
	if err := SeedPlants(db); err != nil {
		return fmt.Errorf("failed to seed plants: %w", err)
	}
	
	// Seed admin user
	if err := SeedAdminUser(db); err != nil {
		return fmt.Errorf("failed to seed admin user: %w", err)
	}
	
	return nil
}