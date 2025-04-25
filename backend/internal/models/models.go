package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// User model
type User struct {
	gorm.Model
	ID       uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Name     string         `json:"name"`
	Email    string         `gorm:"uniqueIndex" json:"email"`
	Password string         `json:"-"` // Password is not exposed in JSON
	Gardens  []Garden       `gorm:"foreignKey:UserID" json:"-"`
	GardenIDs []string      `gorm:"-" json:"gardens"`
}

// Plant model with time-aware fields
type Plant struct {
	gorm.Model
	ID              uuid.UUID                `gorm:"type:uuid;primary_key" json:"id"`
	Name            string                   `json:"name"`
	ImageURL        string                   `json:"imageUrl,omitempty"`
	Description     string                   `json:"description"`
	NutrientImpact  datatypes.JSON           `gorm:"type:jsonb" json:"-"` // Stored as JSON in DB
	Nutrients       *PlantNutrients          `gorm:"-" json:"nutrients"`  // For JSON API interaction
	GrowthCycle     datatypes.JSON           `gorm:"type:jsonb" json:"-"` // Stored as JSON in DB
	Growth          *GrowthCycle             `gorm:"-" json:"growthCycle"`  // For JSON API interaction
	CompatiblePlants datatypes.JSONSlice[string] `gorm:"type:text[]" json:"compatiblePlants"`
	FertilizerNeed  float64                  `json:"-"` // Threshold for fertilizer alerts
}

// PlantNutrients represents the impact a plant has on soil nutrients
type PlantNutrients struct {
	NitrogenImpact   int `json:"nitrogenImpact"`
	PhosphorusImpact int `json:"phosphorusImpact"`
	PotassiumImpact  int `json:"potassiumImpact"`
}

// GrowthCycle represents the timeline of plant growth
type GrowthCycle struct {
	Germination int `json:"germination"`
	Maturity    int `json:"maturity"`
	Harvest     int `json:"harvest"`
}

// Garden model
type Garden struct {
	gorm.Model
	ID        uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	Name      string           `json:"name"`
	Rows      int              `json:"rows"`
	Columns   int              `json:"columns"`
	UserID    uuid.UUID        `json:"-"`
	Plants    []PlantPlacement `gorm:"foreignKey:GardenID" json:"plants"`
	SoilData  datatypes.JSON   `gorm:"type:jsonb" json:"-"`          // Stored as JSON in DB
	Soil      *GardenSoilData  `gorm:"-" json:"soilData"`            // For JSON API interaction
	CreatedAt time.Time        `json:"createdAt"`
}

// PlantPlacement represents a plant placed in a specific position in a garden
type PlantPlacement struct {
	gorm.Model
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"-"`
	GardenID    uuid.UUID      `json:"-"`
	PlantID     uuid.UUID      `json:"plantId"`
	Position    datatypes.JSON `gorm:"type:jsonb" json:"-"`       // Stored as JSON in DB
	Pos         *Position      `gorm:"-" json:"position"`         // For JSON API interaction
	PlantedDate time.Time      `json:"plantedDate"`
}

// Position represents the row and column in a garden grid
type Position struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// GardenSoilData represents the soil data for a garden
type GardenSoilData struct {
	Cells       [][]SoilCell `json:"cells"`
	LastUpdated time.Time    `json:"lastUpdated"`
}

// SoilCell represents soil data for a single cell in the garden
type SoilCell struct {
	Moisture   float64 `json:"moisture"`
	Nitrogen   float64 `json:"nitrogen"`
	Phosphorus float64 `json:"phosphorus"`
	Potassium  float64 `json:"potassium"`
	PH         float64 `json:"ph"`
}

// GardenEvent represents an event in a garden's timeline
type GardenEvent struct {
	gorm.Model
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	GardenID     uuid.UUID      `json:"gardenId"`
	EventDate    time.Time      `json:"date"`
	EventType    string         `json:"type"` // "PLANTING", "HARVEST", "FERTILIZE"
	PlantID      *uuid.UUID     `json:"plantId,omitempty"`
	Title        string         `json:"title"`
	SoilSnapshot datatypes.JSON `gorm:"type:jsonb" json:"-"`
}

// CalendarEvent represents an event in a calendar
type CalendarEvent struct {
	ID       string     `json:"id"`
	Title    string     `json:"title"`
	Start    time.Time  `json:"start"`
	End      *time.Time `json:"end,omitempty"`
	Type     string     `json:"type"` // 'planting' | 'harvest' | 'maintenance'
	PlantID  string     `json:"plantId,omitempty"`
	GardenID string     `json:"gardenId"`
	Color    string     `json:"color,omitempty"`
}

// TimelinePoint represents a point in the soil timeline
type TimelinePoint struct {
	Date           time.Time        `json:"date"`
	Nitrogen       float64          `json:"nitrogen"`
	Phosphorus     float64          `json:"phosphorus"`
	Potassium      float64          `json:"potassium"`
	FertilizerAlert bool            `json:"fertilizerAlert"`
	Events         []CalendarEvent  `json:"events,omitempty"`
}

// SoilTimeline represents the timeline of soil changes
type SoilTimeline struct {
	Timeline []TimelinePoint `json:"timeline"`
}

// BeforeCreate hook for UUID generation
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (p *Plant) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (g *Garden) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}

func (pp *PlantPlacement) BeforeCreate(tx *gorm.DB) error {
	if pp.ID == uuid.Nil {
		pp.ID = uuid.New()
	}
	return nil
}

func (ge *GardenEvent) BeforeCreate(tx *gorm.DB) error {
	if ge.ID == uuid.Nil {
		ge.ID = uuid.New()
	}
	return nil
}