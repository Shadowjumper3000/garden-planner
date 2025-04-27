package handlers

import (
	"encoding/json"
	"errors"
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
	CompanionBenefits string                `json:"companionBenefits"`
	FertilizerNeed  float64                 `json:"fertilizerNeed"`
}

// PlantResponse represents a plant with its edit permissions
type PlantResponse struct {
	models.Plant
	IsEditable bool `json:"isEditable"` // Indicates if the current user can edit this plant
}

// GetAllPlants returns all available plants with edit permissions
func (h *PlantHandler) GetAllPlants(c *gin.Context) {
	var plants []models.Plant
	if err := h.DB.Find(&plants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plants"})
		return
	}

	// Prepare response with edit permissions
	plantResponses := make([]PlantResponse, len(plants))
	
	// Check if user is authenticated (optional for this endpoint)
	userIDStr, exists := c.Get("userId")
	var currentUserID uuid.UUID
	
	if exists {
		// Convert userID from string to UUID if authenticated
		if userIDStr, ok := userIDStr.(string); ok {
			var err error
			currentUserID, err = uuid.Parse(userIDStr)
			if err != nil {
				// Just log this error but continue - edit permissions will be false
				println("Invalid user ID format in GetAllPlants:", err.Error())
			}
		}
	}

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

		// Set edit permission (false for unauthenticated users)
		isEditable := false
		if exists && currentUserID != uuid.Nil {
			// Get user role from context to check for admin status
			userRole, roleExists := c.Get("userRole")
			isAdmin := roleExists && userRole.(string) == "admin"
			
			// User can edit if they are the creator, it's a common plant, or they're an admin
			isEditable = plants[i].CreatorID == currentUserID || plants[i].IsCommon || isAdmin
		}
		
		plantResponses[i] = PlantResponse{
			Plant:      plants[i],
			IsEditable: isEditable,
		}
	}

	c.JSON(http.StatusOK, plantResponses)
}

// GetPlantByID returns a specific plant with edit permission
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

	// Set edit permission based on authentication status
	isEditable := false
	
	// Check if user is authenticated (optional for this endpoint)
	userIDStr, exists := c.Get("userId")
	if exists {
		// Convert userID from string to UUID if authenticated
		if userIDStr, ok := userIDStr.(string); ok {
			currentUserID, err := uuid.Parse(userIDStr)
			if err == nil {
				// Get user role from context to check for admin status
				userRole, roleExists := c.Get("userRole")
				isAdmin := roleExists && userRole.(string) == "admin"
				
				// User can edit if they are the creator, it's a common plant, or they're an admin
				isEditable = plant.CreatorID == currentUserID || plant.IsCommon || isAdmin
			}
		}
	}

	c.JSON(http.StatusOK, PlantResponse{
		Plant:      plant,
		IsEditable: isEditable,
	})
}

// CreatePlant creates a new plant and logs the activity
func (h *PlantHandler) CreatePlant(c *gin.Context) {
	var req CreatePlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
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
	newPlantID := uuid.New()
	plant := models.Plant{
		ID:               newPlantID,
		Name:             req.Name,
		ImageURL:         req.ImageURL,
		Description:      req.Description,
		CreatorID:        currentUserID,
		NutrientImpact:   nutrientJSON,
		Nutrients:        &req.Nutrients, // For the response
		GrowthCycle:      growthJSON,
		Growth:           &req.GrowthCycle, // For the response
		CompatiblePlants: req.CompatiblePlants,
		CompanionBenefits: req.CompanionBenefits,
		FertilizerNeed:   req.FertilizerNeed,
		IsCommon:         false, // User-created plants are not part of common library
	}

	// Use a transaction to ensure both plant creation and activity logging succeed or fail together
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Save plant to database
		if err := tx.Create(&plant).Error; err != nil {
			return err
		}

		// Log the plant creation activity
		details, _ := json.Marshal(map[string]interface{}{
			"plantName": req.Name,
		})

		activity := models.UserActivity{
			ID:           uuid.New(),
			UserID:       currentUserID,
			ActivityType: "CREATE_PLANT",
			ResourceID:   &newPlantID,
			ResourceType: "PLANT",
			Timestamp:    plant.CreatedAt,
			Details:      details,
		}

		if err := tx.Create(&activity).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create plant"})
		return
	}

	c.JSON(http.StatusCreated, PlantResponse{
		Plant:      plant,
		IsEditable: true, // Creator can edit their own plant
	})
}

// UpdatePlant updates a plant if the user is the creator
func (h *PlantHandler) UpdatePlant(c *gin.Context) {
	// Get plant ID from URL
	plantIDStr := c.Param("id")
	plantID, err := uuid.Parse(plantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plant ID"})
		return
	}

	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID (fix for auth middleware storing it as string)
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Check if plant exists and user is the creator
	var plant models.Plant
	if err := h.DB.First(&plant, "id = ?", plantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plant not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Get user role from context
	userRole, roleExists := c.Get("userRole")
	isAdmin := roleExists && userRole.(string) == "admin"
	
	// Verify ownership, common plant, or admin status
	if plant.CreatorID != currentUserID && !plant.IsCommon && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only edit plants you created or common plants"})
		return
	}

	// Parse request
	var req CreatePlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	plant.Name = req.Name
	plant.Description = req.Description
	plant.ImageURL = req.ImageURL
	plant.CompatiblePlants = req.CompatiblePlants
	plant.CompanionBenefits = req.CompanionBenefits
	plant.FertilizerNeed = req.FertilizerNeed

	// Marshal nutrient impact to JSON
	if nutrientJSON, err := json.Marshal(req.Nutrients); err == nil {
		plant.NutrientImpact = nutrientJSON
		plant.Nutrients = &req.Nutrients
	}

	// Marshal growth cycle to JSON
	if growthJSON, err := json.Marshal(req.GrowthCycle); err == nil {
		plant.GrowthCycle = growthJSON
		plant.Growth = &req.GrowthCycle
	}

	// Save changes
	if err := h.DB.Save(&plant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update plant"})
		return
	}

	// Log the plant update activity
	details, _ := json.Marshal(map[string]interface{}{
		"plantName": plant.Name,
	})

	activity := models.UserActivity{
		ID:           uuid.New(),
		UserID:       currentUserID,
		ActivityType: "UPDATE_PLANT",
		ResourceID:   &plantID,
		ResourceType: "PLANT",
		Timestamp:    plant.UpdatedAt,
		Details:      details,
	}

	if err := h.DB.Create(&activity).Error; err != nil {
		// Just log the error but don't fail the request
		// We've already updated the plant successfully
		// Log file would be better than printing to console in production
		println("Failed to log plant update activity:", err.Error())
	}

	c.JSON(http.StatusOK, PlantResponse{
		Plant:      plant,
		IsEditable: true,
	})
}

// DeletePlant deletes a plant if the user is the creator
func (h *PlantHandler) DeletePlant(c *gin.Context) {
	// Get plant ID from URL
	plantIDStr := c.Param("id")
	plantID, err := uuid.Parse(plantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plant ID"})
		return
	}

	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Check if plant exists and user is the creator
	var plant models.Plant
	if err := h.DB.First(&plant, "id = ?", plantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plant not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Check ownership
	if plant.CreatorID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete plants you created"})
		return
	}

	// Use transaction to ensure both deletion and activity logging succeed or fail
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Record details before deletion
		plantName := plant.Name
		
		// Delete plant
		if err := tx.Delete(&plant).Error; err != nil {
			return err
		}

		// Log deletion activity
		details, _ := json.Marshal(map[string]interface{}{
			"plantName": plantName,
		})

		activity := models.UserActivity{
			ID:           uuid.New(),
			UserID:       currentUserID,
			ActivityType: "DELETE_PLANT",
			ResourceID:   &plantID,
			ResourceType: "PLANT",
			Timestamp:    plant.UpdatedAt,
			Details:      details,
		}

		if err := tx.Create(&activity).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete plant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plant deleted successfully"})
}

// CopyPlant creates a copy of an existing plant for the current user
func (h *PlantHandler) CopyPlant(c *gin.Context) {
	// Get plant ID from URL
	plantIDStr := c.Param("id")
	plantID, err := uuid.Parse(plantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plant ID"})
		return
	}

	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID (fix for auth middleware storing it as string)
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Fetch the original plant
	var sourcePlant models.Plant
	if err := h.DB.First(&sourcePlant, "id = ?", plantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plant not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Parse any modification requests
	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse nutrient impact from source plant
	var nutrients models.PlantNutrients
	if sourcePlant.NutrientImpact != nil {
		if err := json.Unmarshal(sourcePlant.NutrientImpact, &nutrients); err == nil {
			sourcePlant.Nutrients = &nutrients
		}
	}

	// Parse growth cycle from source plant
	var growth models.GrowthCycle
	if sourcePlant.GrowthCycle != nil {
		if err := json.Unmarshal(sourcePlant.GrowthCycle, &growth); err == nil {
			sourcePlant.Growth = &growth
		}
	}

	// Create a new plant based on the source
	newPlantID := uuid.New()
	newPlant := models.Plant{
		ID:                newPlantID,
		Name:              sourcePlant.Name + " (Copy)",
		ImageURL:          sourcePlant.ImageURL,
		Description:       sourcePlant.Description,
		CreatorID:         currentUserID,
		NutrientImpact:    sourcePlant.NutrientImpact,
		Nutrients:         sourcePlant.Nutrients,
		GrowthCycle:       sourcePlant.GrowthCycle,
		Growth:            sourcePlant.Growth,
		CompatiblePlants:  sourcePlant.CompatiblePlants,
		CompanionBenefits: sourcePlant.CompanionBenefits,
		FertilizerNeed:    sourcePlant.FertilizerNeed,
		IsCommon:          false, // User copies are never common plants
	}

	// Apply any modifications if provided
	if name, ok := modifications["name"].(string); ok && name != "" {
		newPlant.Name = name
	}
	if desc, ok := modifications["description"].(string); ok && desc != "" {
		newPlant.Description = desc
	}
	if imageURL, ok := modifications["imageUrl"].(string); ok {
		newPlant.ImageURL = imageURL
	}

	// Use transaction to ensure both creation and activity logging succeed or fail
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Save new plant
		if err := tx.Create(&newPlant).Error; err != nil {
			return err
		}

		// Log plant copy activity
		details, _ := json.Marshal(map[string]interface{}{
			"sourcePlantId":   sourcePlant.ID,
			"sourcePlantName": sourcePlant.Name,
			"newPlantName":    newPlant.Name,
		})

		activity := models.UserActivity{
			ID:           uuid.New(),
			UserID:       currentUserID,
			ActivityType: "COPY_PLANT",
			ResourceID:   &newPlantID,
			ResourceType: "PLANT",
			Timestamp:    newPlant.CreatedAt,
			Details:      details,
		}

		if err := tx.Create(&activity).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not copy plant"})
		return
	}

	c.JSON(http.StatusCreated, PlantResponse{
		Plant:      newPlant,
		IsEditable: true, // User can edit their own copy
	})
}

// GetMyPlants returns all plants created by the current user
func (h *PlantHandler) GetMyPlants(c *gin.Context) {
	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	var plants []models.Plant
	if err := h.DB.Where("creator_id = ?", currentUserID).Find(&plants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plants"})
		return
	}

	// Process all plants
	plantResponses := make([]PlantResponse, len(plants))
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

		// User can edit their own plants
		plantResponses[i] = PlantResponse{
			Plant:      plants[i],
			IsEditable: true,
		}
	}

	c.JSON(http.StatusOK, plantResponses)
}

// GetSharedPlants returns all plants created by other users (shared plants)
func (h *PlantHandler) GetSharedPlants(c *gin.Context) {
	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	var plants []models.Plant
	if err := h.DB.Where("creator_id != ? OR is_common = true", currentUserID).Find(&plants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plants"})
		return
	}

	// Process all plants
	plantResponses := make([]PlantResponse, len(plants))
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

		// User can only edit common plants, not plants created by others
		plantResponses[i] = PlantResponse{
			Plant:      plants[i],
			IsEditable: plants[i].IsCommon,
		}
	}

	c.JSON(http.StatusOK, plantResponses)
}

// GetRecentPlants returns recently added or updated plants
func (h *PlantHandler) GetRecentPlants(c *gin.Context) {
	// Get current user ID from context
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	// Convert userID from string to UUID
	currentUserID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user role from context to check for admin status
	userRole, roleExists := c.Get("userRole")
	isAdmin := roleExists && userRole.(string) == "admin"

	// Limit to 20 most recent plants
	limit := 20
	
	// Find recent plants - combining user's plants with common plants they've recently interacted with
	var plants []models.Plant
	
	// Query recent plants through user activities
	// Fix the SQL query by including the ordering columns in the SELECT clause
	query := h.DB.Table("plants").
		Select("plants.*, COALESCE(plants.updated_at, plants.created_at) as sort_date").
		Joins("LEFT JOIN user_activities ON user_activities.resource_id::uuid = plants.id AND user_activities.resource_type = 'PLANT'").
		Where("plants.creator_id = ? OR plants.is_common = true OR user_activities.user_id = ?", currentUserID, currentUserID).
		Group("plants.id"). // Use GROUP BY instead of DISTINCT to avoid SQL error
		Order("sort_date DESC").
		Limit(limit)
		
	if err := query.Find(&plants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch recent plants"})
		return
	}

	// Process all plants
	plantResponses := make([]PlantResponse, len(plants))
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

		// User can edit if they are the creator, it's a common plant and they're an admin
		isEditable := plants[i].CreatorID == currentUserID || (plants[i].IsCommon && isAdmin)
		
		plantResponses[i] = PlantResponse{
			Plant:      plants[i],
			IsEditable: isEditable,
		}
	}

	c.JSON(http.StatusOK, plantResponses)
}