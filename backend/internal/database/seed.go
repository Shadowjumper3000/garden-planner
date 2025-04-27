package database

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/config"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedPlants populates the database with initial plant data
func SeedPlants(db *gorm.DB) error {
	var count int64
	db.Model(&models.Plant{}).Count(&count)
	
	// Only seed if no plants exist
	if count > 0 {
		return nil
	}
	
	log.Println("Seeding plants data...")

	// First find or create a system admin account for shared plants
	var adminUser models.User
	if err := db.Where("role = ?", "admin").First(&adminUser).Error; err != nil {
		// No admin found, we'll create one during admin seeding
		// This is just a fallback; the SeedAdminUser function will handle actual admin creation
		adminUser.ID = uuid.New()
	}
	
	// Initialize plants data
	plants := []struct {
		Name        string
		ImageURL    string
		Description string
		Nutrients   models.PlantNutrients
		GrowthCycle models.GrowthCycle
		Compatible  []string
		Benefits    string
		Fertilizer  float64
	}{
		{
			Name:        "Tomato",
			ImageURL:    "", // Removed image URL to use placeholder
			Description: "A popular garden vegetable that produces red, juicy fruits.",
			Nutrients: models.PlantNutrients{
				NitrogenImpact:   -8,
				PhosphorusImpact: -5,
				PotassiumImpact:  -7,
			},
			GrowthCycle: models.GrowthCycle{
				Germination: 7,
				Maturity:    60,
				Harvest:     90,
			},
			Compatible: []string{"Basil", "Marigold", "Carrots"},
			Benefits:   "Pairs well with basil which helps improve flavor and repel pests.",
			Fertilizer: 40.0,
		},
		{
			Name:        "Basil",
			ImageURL:    "", // Removed image URL to use placeholder
			Description: "Aromatic herb that pairs well with tomatoes, both in the garden and in cooking.",
			Nutrients: models.PlantNutrients{
				NitrogenImpact:   -2,
				PhosphorusImpact: -1,
				PotassiumImpact:  -2,
			},
			GrowthCycle: models.GrowthCycle{
				Germination: 5,
				Maturity:    30,
				Harvest:     45,
			},
			Compatible: []string{"Tomato", "Pepper", "Lettuce"},
			Benefits:   "Repels insects and enhances the flavor of neighboring tomatoes.",
			Fertilizer: 25.0,
		},
		{
			Name:        "Carrot",
			ImageURL:    "", // Removed image URL to use placeholder
			Description: "Root vegetable that grows well in loose, sandy soil.",
			Nutrients: models.PlantNutrients{
				NitrogenImpact:   -4,
				PhosphorusImpact: -3,
				PotassiumImpact:  -5,
			},
			GrowthCycle: models.GrowthCycle{
				Germination: 10,
				Maturity:    70,
				Harvest:     80,
			},
			Compatible: []string{"Tomato", "Onion", "Peas"},
			Benefits:   "Loosens soil for other plants when harvested.",
			Fertilizer: 30.0,
		},
		{
			Name:        "Lettuce",
			ImageURL:    "", // Removed image URL to use placeholder
			Description: "Leafy green that grows quickly and can be harvested multiple times.",
			Nutrients: models.PlantNutrients{
				NitrogenImpact:   -3,
				PhosphorusImpact: -1,
				PotassiumImpact:  -2,
			},
			GrowthCycle: models.GrowthCycle{
				Germination: 3,
				Maturity:    45,
				Harvest:     50,
			},
			Compatible: []string{"Basil", "Carrots", "Radish"},
			Benefits:   "Quick growing and can provide shade for heat-sensitive plants.",
			Fertilizer: 20.0,
		},
		{
			Name:        "Green Beans",
			ImageURL:    "", // Removed image URL to use placeholder
			Description: "Legume that fixes nitrogen in the soil, beneficial for garden rotation.",
			Nutrients: models.PlantNutrients{
				NitrogenImpact:   5,  // Nitrogen-fixing plants add nitrogen to soil
				PhosphorusImpact: -2,
				PotassiumImpact:  -3,
			},
			GrowthCycle: models.GrowthCycle{
				Germination: 8,
				Maturity:    55,
				Harvest:     60,
			},
			Compatible: []string{"Corn", "Potato", "Cucumber"},
			Benefits:   "Fixes nitrogen in soil, improving soil health for future plantings.",
			Fertilizer: 15.0,
		},
	}

	// Create each plant in database
	for _, p := range plants {
		// Marshal nutrient impact to JSON
		nutrientJSON, err := json.Marshal(p.Nutrients)
		if err != nil {
			return err
		}

		// Marshal growth cycle to JSON
		growthJSON, err := json.Marshal(p.GrowthCycle)
		if err != nil {
			return err
		}

		plant := models.Plant{
			ID:              uuid.New(),
			Name:            p.Name,
			ImageURL:        p.ImageURL,
			Description:     p.Description,
			CreatorID:       adminUser.ID,  // Set admin as creator for default plants
			IsCommon:        true,          // Mark as common plant that can be edited by anyone
			NutrientImpact:  nutrientJSON,
			GrowthCycle:     growthJSON,
			CompatiblePlants: p.Compatible,
			CompanionBenefits: p.Benefits,
			FertilizerNeed:  p.Fertilizer,
		}

		if err := db.Create(&plant).Error; err != nil {
			return err
		}
	}

	log.Println("Seeded database with initial plants")
	return nil
}

// SeedAdminUser creates an admin user if one doesn't exist already
func SeedAdminUser(db *gorm.DB) error {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)

	// Only seed if no admin exists
	if count > 0 {
		log.Println("Admin user already exists, skipping admin seed")
		return nil
	}

	log.Println("Creating admin user...")

	// Get admin configuration from environment variables via config
	cfg := config.LoadConfig()
	securePassword := cfg.AdminPassword
	adminEmail := cfg.AdminEmail
	
	log.Printf("Using admin credentials from environment - Email: %s", adminEmail)
	
	// Validate that we have a password before continuing
	if securePassword == "" {
		return errors.New("admin password cannot be empty")
	}
	
	// Generate password hash with proper cost factor
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(securePassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %v", err)
	}

	// Create admin user
	admin := models.User{
		ID:       uuid.New(),
		Name:     "Admin User",
		Email:    adminEmail,
		Password: string(hashedPassword),
		Role:     "admin",
	}

	if err := db.Create(&admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}

	log.Printf("Admin user created successfully with email: %s", adminEmail)
	log.Println("Use the password from your .env file to log in (not the hashed version)")
	return nil
}

// SeedUser creates a new user with default data
func SeedUser(db *gorm.DB, user models.User) (*models.User, error) {
	// Check if user already exists
	var existingUser models.User
	if err := db.Where("email = ?", user.Email).First(&existingUser).Error; err == nil {
		// User already exists, return
		return &existingUser, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Unexpected error
		return nil, err
	}

	// User doesn't exist, create them
	user.ID = uuid.New()
	user.Role = "user" // Default role
	user.CreatedAt = time.Now()
	
	// Use transaction to ensure all operations succeed or fail together
	tx := db.Begin()
	
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create a few starter plants for the new user
	starterPlants := []models.Plant{
		{
			ID:          uuid.New(),
			Name:        "Tomato (Custom)",
			ImageURL:    "https://images.unsplash.com/photo-1594913924331-a3dd310816ec?w=800&auto=format&fit=crop",
			Description: "A versatile nightshade vegetable with many culinary uses.",
			CreatorID:   user.ID,
			NutrientImpact: mustMarshalJSON(models.PlantNutrients{
				NitrogenImpact:   -5,
				PhosphorusImpact: -4,
				PotassiumImpact:  -6,
			}),
			GrowthCycle: mustMarshalJSON(models.GrowthCycle{
				Germination: 7,
				Maturity:    60,
				Harvest:     90,
			}),
			CompatiblePlants:  []string{"Basil", "Marigold", "Asparagus"},
			CompanionBenefits: "Basil improves flavor and repels pests. Marigolds deter nematodes.",
			IsCommon:          false,
		},
		{
			ID:          uuid.New(),
			Name:        "Basil (Custom)",
			ImageURL:    "https://images.unsplash.com/photo-1628879078320-eff57927f6d6?w=800&auto=format&fit=crop",
			Description: "Aromatic herb commonly used in Italian cuisine. Attracts beneficial insects.",
			CreatorID:   user.ID,
			NutrientImpact: mustMarshalJSON(models.PlantNutrients{
				NitrogenImpact:   -2,
				PhosphorusImpact: -1,
				PotassiumImpact:  -2,
			}),
			GrowthCycle: mustMarshalJSON(models.GrowthCycle{
				Germination: 5,
				Maturity:    30,
				Harvest:     60,
			}),
			CompatiblePlants:  []string{"Tomato", "Pepper", "Oregano"},
			CompanionBenefits: "Improves growth and flavor of tomatoes and repels flies and mosquitoes.",
			IsCommon:          false,
		},
	}

	// Save starter plants
	for _, plant := range starterPlants {
		if err := tx.Create(&plant).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// Helper function to marshal JSON and panic if it fails (only used during seeding)
func mustMarshalJSON(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return data
}