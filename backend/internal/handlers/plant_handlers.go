package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"gorm.io/gorm"
)

// PlantHandler handles plant-related routes
type PlantHandler struct {
	DB *gorm.DB
}

// CreatePlantRequest holds data for plant creation
type CreatePlantRequest struct {
	Name            string                  `json:"name" binding:"required"`
	ImageURL        string                  `json:"imageUrl"`
	Description     string                  `json:"description" binding:"required"`
	Nutrients       models.PlantNutrients   `json:"nutrients" binding:"required"`
	GrowthCycle     models.GrowthCycle      `json:"growthCycle" binding:"required"`
	CompatiblePlants []string               `json:"compatiblePlants"`
	FertilizerNeed  float64                 `json:"fertilizerNeed"`
}

// GetAllPlants returns all available plants
func (h *PlantHandler) GetAllPlants(c *gin.Context) {
	var plants []models.Plant
	if err := h.DB.Find(&plants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plants"})
		return
	}

	// Parse JSON fields for each plant
	for i := range plants {
		// Parse nutrient impact
		var nutrients models.PlantNutrients
		if plants[i].NutrientImpact != nil {
			if err := json.Unmarshal(plants[i].NutrientImpact, &nutrients); err == nil {
				plants[i].Nutrients = &nutrients
			}
		}

		// Parse growth cycle
		var growth models.GrowthCycle
		if plants[i].GrowthCycle != nil {
			if err := json.Unmarshal(plants[i].GrowthCycle, &growth); err == nil {
				plants[i].Growth = &growth
			}
		}
	}

	c.JSON(http.StatusOK, plants)
}

// GetPlantByID returns a specific plant
func (h *PlantHandler) GetPlantByID(c *gin.Context) {
	// Get the plant ID from the URL parameter
	plantIDStr := c.Param("id")
	plantID, err := uuid.Parse(plantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plant ID format"})
		return
	}

	// Find the plant
	var plant models.Plant
	if err := h.DB.First(&plant, "id = ?", plantID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plant not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plant"})
		}
		return
	}

	// Parse nutrient impact
	var nutrients models.PlantNutrients
	if plant.NutrientImpact != nil {
		if err := json.Unmarshal(plant.NutrientImpact, &nutrients); err == nil {
			plant.Nutrients = &nutrients
		}
	}

	// Parse growth cycle
	var growth models.GrowthCycle
	if plant.GrowthCycle != nil {
		if err := json.Unmarshal(plant.GrowthCycle, &growth); err == nil {
			plant.Growth = &growth
		}
	}

	c.JSON(http.StatusOK, plant)
}

// CreatePlant creates a new plant
func (h *PlantHandler) CreatePlant(c *gin.Context) {
	var req CreatePlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Marshal nutrient impact to JSON
	nutrientJSON, err := json.Marshal(req.Nutrients)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process nutrient data"})
		return
	}

	// Marshal growth cycle to JSON
	growthJSON, err := json.Marshal(req.GrowthCycle)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process growth cycle data"})
		return
	}

	// Create new plant
	plant := models.Plant{
		ID:              uuid.New(),
		Name:            req.Name,
		ImageURL:        req.ImageURL,
		Description:     req.Description,
		NutrientImpact:  nutrientJSON,
		Nutrients:       &req.Nutrients, // For the response
		GrowthCycle:     growthJSON,
		Growth:          &req.GrowthCycle, // For the response
		CompatiblePlants: req.CompatiblePlants,
		FertilizerNeed:  req.FertilizerNeed,
	}

	// Save to database
	if err := h.DB.Create(&plant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create plant"})
		return
	}

	c.JSON(http.StatusCreated, plant)
}