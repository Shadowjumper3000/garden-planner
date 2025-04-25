package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	CORS     CORSConfig
}

// ServerConfig holds server-specific configuration
type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowOrigins     []string
	AllowCredentials bool
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("SERVER_PORT", "8080"),
			ReadTimeout:  time.Duration(getEnvAsInt("SERVER_READ_TIMEOUT", 10)) * time.Second,
			WriteTimeout: time.Duration(getEnvAsInt("SERVER_WRITE_TIMEOUT", 10)) * time.Second,
			IdleTimeout:  time.Duration(getEnvAsInt("SERVER_IDLE_TIMEOUT", 30)) * time.Second,
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "garden_planner"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-secret-key"),
			Expiration: time.Duration(getEnvAsInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
		},
		CORS: CORSConfig{
			AllowOrigins:     getEnvAsSlice("CORS_ALLOW_ORIGINS", []string{"http://localhost:3000"}),
			AllowCredentials: getEnvAsBool("CORS_ALLOW_CREDENTIALS", true),
		},
	}
}

// Get an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// Get an environment variable as an integer or a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	
	value := 0
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	if err != nil {
		return defaultValue
	}
	
	return value
}

// Get an environment variable as a boolean or a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	
	return value
}

// Get an environment variable as a slice or a default value
func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	
	return strings.Split(valueStr, ",")
}