package database

import (
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
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
	
	// Initialize plants data
	plants := []struct {
		Name        string
		ImageURL    string
		Description string
		Nutrients   models.PlantNutrients
		GrowthCycle models.GrowthCycle
		Compatible  []string
		Fertilizer  float64
	}{
		{
			Name:        "Tomato",
			ImageURL:    "https://images.unsplash.com/photo-1518977676601-b53f82aba655",
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
			Fertilizer: 40.0,
		},
		{
			Name:        "Basil",
			ImageURL:    "https://images.unsplash.com/photo-1601307636238-a6f43c0f1ec3",
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
			Fertilizer: 25.0,
		},
		{
			Name:        "Carrot",
			ImageURL:    "https://images.unsplash.com/photo-1598170845035-39f9d320a885",
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
			Fertilizer: 30.0,
		},
		{
			Name:        "Lettuce",
			ImageURL:    "https://images.unsplash.com/photo-1558401395-38de5d87a34e",
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
			Fertilizer: 20.0,
		},
		{
			Name:        "Green Beans",
			ImageURL:    "https://images.unsplash.com/photo-1567253577618-1dbf84855b91",
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
			NutrientImpact:  nutrientJSON,
			GrowthCycle:     growthJSON,
			CompatiblePlants: p.Compatible,
			FertilizerNeed:  p.Fertilizer,
		}

		if err := db.Create(&plant).Error; err != nil {
			return err
		}
	}

	log.Println("Seeded database with initial plants")
	return nil
}