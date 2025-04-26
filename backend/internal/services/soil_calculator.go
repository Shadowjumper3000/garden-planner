package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"gorm.io/gorm"
)

// SoilCalculator implements soil nutrient simulation algorithms
type SoilCalculator struct {
	DB *gorm.DB
}

// DailyDecayRate is the percentage of nutrients that decay each day
const DailyDecayRate = 0.01 // 1% per day

// GenerateForecast generates a timeline of soil conditions and events
func (sc *SoilCalculator) GenerateForecast(gardenID uuid.UUID, months int) (*models.SoilTimeline, error) {
	// Get the garden with its soil data
	var garden models.Garden
	if err := sc.DB.First(&garden, "id = ?", gardenID).Error; err != nil {
		return nil, fmt.Errorf("garden not found: %w", err)
	}

	// Get all plants in the garden
	var placements []models.PlantPlacement
	if err := sc.DB.Where("garden_id = ?", gardenID).Find(&placements).Error; err != nil {
		return nil, fmt.Errorf("could not fetch plant placements: %w", err)
	}

	// Load plant details for each placement
	plantMap := make(map[uuid.UUID]models.Plant)
	for _, placement := range placements {
		var plant models.Plant
		if err := sc.DB.First(&plant, "id = ?", placement.PlantID).Error; err != nil {
			return nil, fmt.Errorf("could not fetch plant details: %w", err)
		}
		// Parse the nutrient impact and growth cycle from JSON
		var nutrients models.PlantNutrients
		if err := json.Unmarshal(plant.NutrientImpact, &nutrients); err != nil {
			return nil, fmt.Errorf("could not parse nutrient data: %w", err)
		}
		plant.Nutrients = &nutrients

		var growth models.GrowthCycle
		if err := json.Unmarshal(plant.GrowthCycle, &growth); err != nil {
			return nil, fmt.Errorf("could not parse growth cycle: %w", err)
		}
		plant.Growth = &growth

		plantMap[plant.ID] = plant
	}

	// Parse soil data from JSON
	var soilData models.GardenSoilData
	if err := json.Unmarshal(garden.SoilData, &soilData); err != nil {
		return nil, fmt.Errorf("could not parse soil data: %w", err)
	}

	// Calculate forecast days
	daysToSimulate := months * 30 // Approximation
	startDate := time.Now()
	endDate := startDate.AddDate(0, months, 0)

	// Build the initial soil snapshot from current state
	averageSoil := calculateAverageSoil(soilData.Cells)

	// Initialize the timeline
	timeline := &models.SoilTimeline{
		Timeline: make([]models.TimelinePoint, 0, daysToSimulate),
	}

	// Simulate each day
	for date := startDate; date.Before(endDate); date = date.AddDate(0, 0, 1) {
		// Create a point for this day
		point := models.TimelinePoint{
			Date:           date,
			Nitrogen:       averageSoil.Nitrogen,
			Phosphorus:     averageSoil.Phosphorus,
			Potassium:      averageSoil.Potassium,
			FertilizerAlert: false,
			Events:         []models.CalendarEvent{},
		}

		// Apply natural decay
		averageSoil.Nitrogen *= (1.0 - DailyDecayRate)
		averageSoil.Phosphorus *= (1.0 - DailyDecayRate)
		averageSoil.Potassium *= (1.0 - DailyDecayRate)

		// Process events for this day (planting, harvest, etc.)
		for _, placement := range placements {
			plant, exists := plantMap[placement.PlantID]
			if !exists {
				continue
			}

			// Check for harvest events
			harvestDate := placement.PlantedDate.AddDate(0, 0, plant.Growth.Harvest)
			if date.Equal(harvestDate) {
				// Harvest event
				event := models.CalendarEvent{
					ID:       uuid.New().String(),
					Title:    fmt.Sprintf("Harvest %s", plant.Name),
					Start:    date,
					Type:     "harvest",
					PlantID:  plant.ID.String(),
					GardenID: gardenID.String(),
					Color:    "#f97316", // Orange for harvest events
				}
				point.Events = append(point.Events, event)
			}

			// Check for fertilizer need
			if averageSoil.Nitrogen < 30 || averageSoil.Phosphorus < 30 || averageSoil.Potassium < 30 {
				point.FertilizerAlert = true
				// Only add fertilizer event if not already present and low nutrients
				if len(point.Events) == 0 || !hasFertilizerEvent(point.Events) {
					event := models.CalendarEvent{
						ID:       uuid.New().String(),
						Title:    "Fertilizer needed",
						Start:    date,
						Type:     "fertilize",
						GardenID: gardenID.String(),
						Color:    "#3b82f6", // Blue for fertilize events
					}
					point.Events = append(point.Events, event)
				}
			}
		}

		// Add point to timeline
		timeline.Timeline = append(timeline.Timeline, point)
	}

	return timeline, nil
}

// calculateAverageSoil calculates the average soil values across all cells
func calculateAverageSoil(cells [][]models.SoilCell) models.SoilCell {
	if len(cells) == 0 || len(cells[0]) == 0 {
		return models.SoilCell{
			Moisture:   50,
			Nitrogen:   50,
			Phosphorus: 50,
			Potassium:  50,
			PH:         7,
		}
	}

	var sumNitrogen, sumPhosphorus, sumPotassium, sumMoisture, sumPH float64
	var count int

	for _, row := range cells {
		for _, cell := range row {
			sumNitrogen += cell.Nitrogen
			sumPhosphorus += cell.Phosphorus
			sumPotassium += cell.Potassium
			sumMoisture += cell.Moisture
			sumPH += cell.PH
			count++
		}
	}

	if count == 0 {
		count = 1 // Avoid division by zero
	}

	return models.SoilCell{
		Nitrogen:   sumNitrogen / float64(count),
		Phosphorus: sumPhosphorus / float64(count),
		Potassium:  sumPotassium / float64(count),
		Moisture:   sumMoisture / float64(count),
		PH:         sumPH / float64(count),
	}
}

// hasFertilizerEvent checks if the events list already has a fertilizer event
func hasFertilizerEvent(events []models.CalendarEvent) bool {
	for _, event := range events {
		if event.Type == "fertilize" {
			return true
		}
	}
	return false
}

// UpdateGardenWithPlant adds a plant to the garden and calculates the soil impact
func (sc *SoilCalculator) UpdateGardenWithPlant(gardenID uuid.UUID, plantID uuid.UUID, position models.Position, date time.Time) (*models.Garden, error) {
	// Get the garden
	var garden models.Garden
	if err := sc.DB.First(&garden, "id = ?", gardenID).Error; err != nil {
		return nil, fmt.Errorf("garden not found: %w", err)
	}

	// Get the plant
	var plant models.Plant
	if err := sc.DB.First(&plant, "id = ?", plantID).Error; err != nil {
		return nil, fmt.Errorf("plant not found: %w", err)
	}

	// Create the plant placement
	placement := models.PlantPlacement{
		GardenID:    gardenID,
		PlantID:     plantID,
		PlantedDate: date,
	}

	// Marshal the position to JSON
	posJSON, err := json.Marshal(position)
	if err != nil {
		return nil, fmt.Errorf("could not marshal position: %w", err)
	}
	placement.Position = posJSON

	// Start a transaction
	tx := sc.DB.Begin()
	if err := tx.Error; err != nil {
		return nil, fmt.Errorf("could not start transaction: %w", err)
	}

	// Save the placement
	if err := tx.Create(&placement).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not save plant placement: %w", err)
	}

	// Create a garden event for the planting
	event := models.GardenEvent{
		GardenID:  gardenID,
		EventDate: date,
		EventType: "PLANTING",
		PlantID:   &plantID,
		Title:     fmt.Sprintf("Planted %s", plant.Name),
	}

	// Save the event
	if err := tx.Create(&event).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not save garden event: %w", err)
	}

	// Parse the current soil data
	var soilData models.GardenSoilData
	if err := json.Unmarshal(garden.SoilData, &soilData); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not parse soil data: %w", err)
	}

	// Validate that soilData.Cells exists and has content
	if len(soilData.Cells) == 0 {
		fmt.Printf("Warning: garden %s has no soil cells data\n", gardenID)
		// Initialize with default values if empty
		soilData.Cells = make([][]models.SoilCell, garden.Rows)
		for i := range soilData.Cells {
			soilData.Cells[i] = make([]models.SoilCell, garden.Columns)
			for j := range soilData.Cells[i] {
				soilData.Cells[i][j] = models.SoilCell{
					Moisture:   50,
					Nitrogen:   50,
					Phosphorus: 50,
					Potassium:  50,
					PH:         7,
				}
			}
		}
	}

	// Validate position is within garden bounds
	if position.Row < 0 || position.Col < 0 || 
	   position.Row >= len(soilData.Cells) || 
	   (len(soilData.Cells) > 0 && position.Col >= len(soilData.Cells[0])) {
		tx.Rollback()
		colLength := 0
		if len(soilData.Cells) > 0 {
			colLength = len(soilData.Cells[0])
		}
		return nil, fmt.Errorf("invalid position: row %d, col %d is outside garden bounds of %dx%d", 
			position.Row, position.Col, len(soilData.Cells), colLength)
	}

	// Parse the nutrient impact with error handling
	var nutrients models.PlantNutrients
	if plant.NutrientImpact == nil {
		tx.Rollback()
		return nil, fmt.Errorf("plant has no nutrient impact data")
	}

	if err := json.Unmarshal(plant.NutrientImpact, &nutrients); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not parse nutrient data: %w", err)
	}

	// Apply the immediate effect of planting
	soilData.Cells[position.Row][position.Col].Nitrogen += float64(nutrients.NitrogenImpact) * 0.1
	soilData.Cells[position.Row][position.Col].Phosphorus += float64(nutrients.PhosphorusImpact) * 0.1
	soilData.Cells[position.Row][position.Col].Potassium += float64(nutrients.PotassiumImpact) * 0.1

	// Clamp values to valid range
	soilData.Cells[position.Row][position.Col].Nitrogen = clamp(soilData.Cells[position.Row][position.Col].Nitrogen, 0, 100)
	soilData.Cells[position.Row][position.Col].Phosphorus = clamp(soilData.Cells[position.Row][position.Col].Phosphorus, 0, 100)
	soilData.Cells[position.Row][position.Col].Potassium = clamp(soilData.Cells[position.Row][position.Col].Potassium, 0, 100)

	soilData.LastUpdated = time.Now()

	// Marshal the updated soil data
	updatedSoilJSON, err := json.Marshal(soilData)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not marshal updated soil data: %w", err)
	}

	// Debug logging to inspect the JSON data
	fmt.Printf("DEBUG: Updating soil data for garden %s\n", gardenID)
	fmt.Printf("DEBUG: JSON length: %d bytes\n", len(updatedSoilJSON))
	fmt.Printf("DEBUG: Position: row=%d, col=%d\n", position.Row, position.Col)
	
	// Use a raw SQL query with a parameter placeholder to avoid JSON escaping issues
	if err := tx.Exec("UPDATE gardens SET soil_data = ?, updated_at = ? WHERE id = ?", 
		string(updatedSoilJSON), time.Now(), gardenID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("could not update garden soil data: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("could not commit transaction: %w", err)
	}

	// Get the updated garden with all relationships
	if err := sc.DB.Preload("Plants").First(&garden, "id = ?", gardenID).Error; err != nil {
		return nil, fmt.Errorf("could not fetch updated garden: %w", err)
	}

	return &garden, nil
}

// clamp ensures a value is within a range
func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}