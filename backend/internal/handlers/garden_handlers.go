package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services"
	"gorm.io/gorm"
)

// GardenHandler handles garden-related routes
type GardenHandler struct {
	DB             *gorm.DB
	SoilCalculator *services.SoilCalculator
}

// CreateGardenRequest holds data for garden creation
type CreateGardenRequest struct {
	Name    string `json:"name" binding:"required"`
	Rows    int    `json:"rows" binding:"required,min=1,max=20"`
	Columns int    `json:"columns" binding:"required,min=1,max=20"`
}

// AddPlantRequest holds data for adding a plant to a garden
type AddPlantRequest struct {
	PlantID  string          `json:"plantId" binding:"required"`
	Date     string          `json:"date" binding:"required"` // YYYY-MM-DD
	Position models.Position `json:"position" binding:"required"`
}

// GetSoilRequest holds query parameters for soil data retrieval
type GetSoilRequest struct {
	Date string `form:"date"` // Optional, YYYY-MM-DD
}

// GetFutureSoilRequest holds query parameters for future soil prediction
type GetFutureSoilRequest struct {
	Months int `form:"months" binding:"required,min=1,max=12"`
}

// GetAllGardens returns all gardens for the current user
func (h *GardenHandler) GetAllGardens(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Find all gardens for the user
	var gardens []models.Garden
	if err := h.DB.Where("user_id = ?", userID).Find(&gardens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch gardens"})
		return
	}

	// Prepare garden responses with parsed JSON fields
	for i := range gardens {
		// Parse soil data
		var soilData models.GardenSoilData
		if gardens[i].SoilData != nil {
			if err := json.Unmarshal(gardens[i].SoilData, &soilData); err == nil {
				gardens[i].Soil = &soilData
			}
		}

		// Load plants for each garden
		var placements []models.PlantPlacement
		if err := h.DB.Where("garden_id = ?", gardens[i].ID).Find(&placements).Error; err != nil {
			continue
		}

		// Parse position for each plant placement
		for j := range placements {
			var pos models.Position
			if err := json.Unmarshal(placements[j].Position, &pos); err == nil {
				placements[j].Pos = &pos
			}
		}

		gardens[i].Plants = placements
	}

	c.JSON(http.StatusOK, gardens)
}

// GetGardenByID returns a specific garden
func (h *GardenHandler) GetGardenByID(c *gin.Context) {
	// Get the garden ID from the URL parameter
	gardenIDStr := c.Param("id")
	gardenID, err := uuid.Parse(gardenIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid garden ID format"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Find the garden
	var garden models.Garden
	if err := h.DB.Where("id = ? AND user_id = ?", gardenID, userID).First(&garden).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Garden not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch garden"})
		}
		return
	}

	// Parse soil data
	var soilData models.GardenSoilData
	if garden.SoilData != nil {
		if err := json.Unmarshal(garden.SoilData, &soilData); err == nil {
			garden.Soil = &soilData
		}
	}

	// Load plants for the garden
	var placements []models.PlantPlacement
	if err := h.DB.Where("garden_id = ?", garden.ID).Find(&placements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plants"})
		return
	}

	// Parse position for each plant placement
	for i := range placements {
		var pos models.Position
		if err := json.Unmarshal(placements[i].Position, &pos); err == nil {
			placements[i].Pos = &pos
		}
	}

	garden.Plants = placements

	c.JSON(http.StatusOK, garden)
}

// CreateGarden creates a new garden for the current user
func (h *GardenHandler) CreateGarden(c *gin.Context) {
	var req CreateGardenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Create soil data grid
	soilGrid := make([][]models.SoilCell, req.Rows)
	for i := range soilGrid {
		soilGrid[i] = make([]models.SoilCell, req.Columns)
		for j := range soilGrid[i] {
			// Default soil values
			soilGrid[i][j] = models.SoilCell{
				Moisture:   50 + (float64(i+j) * 0.5), // Slight variation for visual interest
				Nitrogen:   50 + (float64(i*j) * 0.1),
				Phosphorus: 50 - (float64(i+j) * 0.1),
				Potassium:  50 + (float64(i-j) * 0.1),
				PH:         6.5 + (float64(i%3) * 0.1),
			}
		}
	}

	soilData := models.GardenSoilData{
		Cells:       soilGrid,
		LastUpdated: time.Now(),
	}

	// Marshal soil data to JSON for storage
	soilJSON, err := json.Marshal(soilData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process soil data"})
		return
	}

	// Create the garden
	garden := models.Garden{
		ID:        uuid.New(),
		Name:      req.Name,
		Rows:      req.Rows,
		Columns:   req.Columns,
		UserID:    userID,
		SoilData:  soilJSON,
		Soil:      &soilData, // For the response
		CreatedAt: time.Now(),
		Plants:    []models.PlantPlacement{}, // Empty plants list for new garden
	}

	// Save to database
	if err := h.DB.Create(&garden).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create garden"})
		return
	}

	c.JSON(http.StatusCreated, garden)
}

// AddPlant adds a plant to a garden
func (h *GardenHandler) AddPlant(c *gin.Context) {
	// Get the garden ID from the URL parameter
	gardenIDStr := c.Param("id")
	gardenID, err := uuid.Parse(gardenIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid garden ID format"})
		return
	}

	// Parse the request body
	var req AddPlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse the plant ID
	plantID, err := uuid.Parse(req.PlantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plant ID format"})
		return
	}

	// Parse the date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Verify garden ownership
	var garden models.Garden
	if err := h.DB.Where("id = ? AND user_id = ?", gardenID, userID).First(&garden).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Garden not found or not authorized"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify garden ownership"})
		}
		return
	}

	// Add plant using the soil calculator service
	updatedGarden, err := h.SoilCalculator.UpdateGardenWithPlant(gardenID, plantID, req.Position, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not add plant to garden: " + err.Error()})
		return
	}

	// Parse soil data and placements for the response
	if updatedGarden.SoilData != nil {
		var soilData models.GardenSoilData
		if err := json.Unmarshal(updatedGarden.SoilData, &soilData); err == nil {
			updatedGarden.Soil = &soilData
		}
	}
	
	// Load plants for the garden
	var placements []models.PlantPlacement
	if err := h.DB.Where("garden_id = ?", updatedGarden.ID).Find(&placements).Error; err == nil {
		// Parse position for each plant placement
		for i := range placements {
			var pos models.Position
			if err := json.Unmarshal(placements[i].Position, &pos); err == nil {
				placements[i].Pos = &pos
			}
		}
		updatedGarden.Plants = placements
	}

	c.JSON(http.StatusOK, updatedGarden)
}

// RemovePlant removes a plant from a garden based on position
func (h *GardenHandler) RemovePlant(c *gin.Context) {
	// Get the garden ID from the URL parameter
	gardenIDStr := c.Param("id")
	gardenID, err := uuid.Parse(gardenIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid garden ID format"})
		return
	}

	// Get position from query parameters
	rowStr := c.Query("row")
	colStr := c.Query("col")

	row, err := strconv.Atoi(rowStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid row parameter"})
		return
	}

	col, err := strconv.Atoi(colStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid col parameter"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Verify garden ownership
	var garden models.Garden
	if err := h.DB.Where("id = ? AND user_id = ?", gardenID, userID).First(&garden).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Garden not found or not authorized"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify garden ownership"})
		}
		return
	}

	// Start a transaction
	tx := h.DB.Begin()
	if err := tx.Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start transaction"})
		return
	}

	// Get all plant placements for this garden to find the matching one
	var placements []models.PlantPlacement
	if err := tx.Where("garden_id = ?", gardenID).Find(&placements).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch plant placements"})
		return
	}

	// Find the placement with the matching position
	var targetPlacement *models.PlantPlacement
	for i := range placements {
		var pos models.Position
		if err := json.Unmarshal(placements[i].Position, &pos); err == nil {
			if pos.Row == row && pos.Col == col {
				targetPlacement = &placements[i]
				break
			}
		}
	}

	if targetPlacement == nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "No plant found at that position"})
		return
	}

	// Delete the found plant placement
	if err := tx.Delete(targetPlacement).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not remove plant: " + err.Error()})
		return
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not commit transaction"})
		return
	}

	// Get the updated garden with plants
	var updatedGarden models.Garden
	if err := h.DB.First(&updatedGarden, "id = ?", gardenID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch updated garden"})
		return
	}

	// Parse soil data
	if updatedGarden.SoilData != nil {
		var soilData models.GardenSoilData
		if err := json.Unmarshal(updatedGarden.SoilData, &soilData); err == nil {
			updatedGarden.Soil = &soilData
		}
	}

	// Load plants for the garden
	placements = []models.PlantPlacement{}
	if err := h.DB.Where("garden_id = ?", updatedGarden.ID).Find(&placements).Error; err == nil {
		// Parse position for each plant placement
		for i := range placements {
			var pos models.Position
			if err := json.Unmarshal(placements[i].Position, &pos); err == nil {
				placements[i].Pos = &pos
			}
		}
		updatedGarden.Plants = placements
	}

	c.JSON(http.StatusOK, updatedGarden)
}

// GetSoilData returns soil data for a garden, optionally at a specific date
func (h *GardenHandler) GetSoilData(c *gin.Context) {
	// Get the garden ID from the URL parameter
	gardenIDStr := c.Param("id")
	gardenID, err := uuid.Parse(gardenIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid garden ID format"})
		return
	}

	// Get query parameters
	var req GetSoilRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Verify garden ownership
	var garden models.Garden
	if err := h.DB.Where("id = ? AND user_id = ?", gardenID, userID).First(&garden).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Garden not found or not authorized"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify garden ownership"})
		}
		return
	}

	// Parse soil data
	var soilData models.GardenSoilData
	if garden.SoilData != nil {
		if err := json.Unmarshal(garden.SoilData, &soilData); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not parse soil data"})
			return
		}
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "No soil data available"})
		return
	}

	// If a specific date is requested, we need to calculate what the soil was/will be like at that date
	if req.Date != "" {
		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
			return
		}

		// If the date is in the future or past, simulate soil conditions
		if !date.Equal(soilData.LastUpdated) {
			// For simplicity, we'll just return current data with a note that this would be calculated
			// In a real implementation, we'd use the soil calculator to predict soil state at that date
			c.JSON(http.StatusOK, gin.H{
				"soilData": soilData,
				"note":     "This is current soil data. In production, this would be calculated for the requested date.",
				"date":     req.Date,
			})
			return
		}
	}

	// Return current soil data
	c.JSON(http.StatusOK, gin.H{"soilData": soilData})
}

// GetFutureSoil generates a soil and event forecast
func (h *GardenHandler) GetFutureSoil(c *gin.Context) {
	// Get the garden ID from the URL parameter
	gardenIDStr := c.Param("id")
	gardenID, err := uuid.Parse(gardenIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid garden ID format"})
		return
	}

	// Get query parameters
	var req GetFutureSoilRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Verify garden ownership
	var garden models.Garden
	if err := h.DB.Where("id = ? AND user_id = ?", gardenID, userID).First(&garden).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Garden not found or not authorized"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify garden ownership"})
		}
		return
	}

	// Generate forecast using the soil calculator
	timeline, err := h.SoilCalculator.GenerateForecast(gardenID, req.Months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate soil forecast: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, timeline)
}