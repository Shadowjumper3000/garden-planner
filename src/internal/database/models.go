package database

import "time"

// User represents an application user
type User struct {
	ID    int    `db:"id"`
	Name  string `db:"name"`
	Email string `db:"email"`
	PasswordHash string `db:"password_hash"`
	Role  string `db:"role"`
	CreatedAt time.Time `db:"created_at"`
}

// Garden represents a user garden
type Garden struct {
	ID        string    `db:"id" json:"id"`
	UserID    int       `db:"user_id" json:"userId"`
	Name      string    `db:"name" json:"name"`
	WidthM    float64   `db:"width_m" json:"widthM"`
	HeightM   float64   `db:"height_m" json:"heightM"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// SoilCell represents soil state for a 0.5m x 0.5m patch
type SoilCell struct {
	ID          string    `db:"id" json:"id"`
	GardenID    string    `db:"garden_id" json:"gardenId"`
	XM          float64   `db:"x_m" json:"x"`
	YM          float64   `db:"y_m" json:"y"`
	Moisture    float64   `db:"moisture" json:"moisture"`
	Nitrogen    float64   `db:"nitrogen" json:"nitrogen"`
	Phosphorus  float64   `db:"phosphorus" json:"phosphorus"`
	Potassium   float64   `db:"potassium" json:"potassium"`
	PH          float64   `db:"ph" json:"ph"`
	RecordedAt  time.Time `db:"recorded_at" json:"recordedAt"`
}

// SoilHistory snapshot
type SoilHistory struct {
	ID         string    `db:"id" json:"id"`
	GardenID   string    `db:"garden_id" json:"gardenId"`
	Snapshot   []byte    `db:"snapshot" json:"snapshot"`
	RecordedAt time.Time `db:"recorded_at" json:"recordedAt"`
}

// Plant in the shared library
type Plant struct {
	ID                string    `db:"id" json:"id"`
	CreatorID         *int      `db:"creator_id" json:"creatorId"`
	Name              string    `db:"name" json:"name"`
	Description       string    `db:"description" json:"description"`
	ImageURL          *string   `db:"image_url" json:"imageUrl"`
	NitrogenImpact    float64   `db:"nitrogen_impact" json:"nitrogenImpact"`
	PhosphorusImpact  float64   `db:"phosphorus_impact" json:"phosphorusImpact"`
	PotassiumImpact   float64   `db:"potassium_impact" json:"potassiumImpact"`
	PHImpact          float64   `db:"ph_impact" json:"phImpact"`
	GerminationDays   int       `db:"germination_days" json:"germinationDays"`
	MaturityDays      int       `db:"maturity_days" json:"maturityDays"`
	HarvestDays       int       `db:"harvest_days" json:"harvestDays"`
	WidthM            float64   `db:"width_m" json:"widthM"`
	HeightM           float64   `db:"height_m" json:"heightM"`
	IsPublic          bool      `db:"is_public" json:"isPublic"`
	CreatedAt         time.Time `db:"created_at" json:"createdAt"`
}

// PlantRelationship between two plants
type PlantRelationship struct {
	ID                  string `db:"id" json:"id"`
	PlantAID            string `db:"plant_a_id" json:"plantAId"`
	PlantBID            string `db:"plant_b_id" json:"plantBId"`
	RelationshipType    string `db:"relationship_type" json:"relationshipType"`
	BenefitDescription  string `db:"benefit_description" json:"benefitDescription"`
}

// PlantPlacement in a garden (position in metres)
type PlantPlacement struct {
	ID          string  `db:"id" json:"id"`
	GardenID    string  `db:"garden_id" json:"gardenId"`
	PlantID     string  `db:"plant_id" json:"plantId"`
	XM          float64 `db:"x_m" json:"x"`
	YM          float64 `db:"y_m" json:"y"`
	WidthM      float64 `db:"width_m" json:"widthM"`
	HeightM     float64 `db:"height_m" json:"heightM"`
	PlantedDate string  `db:"planted_date" json:"plantedDate"`
}

// Notification for a user
type Notification struct {
	ID          string     `db:"id" json:"id"`
	UserID      int        `db:"user_id" json:"userId"`
	GardenID    *string    `db:"garden_id" json:"gardenId"`
	PlantID     *string    `db:"plant_id" json:"plantId"`
	Type        string     `db:"type" json:"type"`
	Title       string     `db:"title" json:"title"`
	Body        string     `db:"body" json:"body"`
	ScheduledAt *time.Time `db:"scheduled_at" json:"scheduledAt"`
	SentAt      *time.Time `db:"sent_at" json:"sentAt"`
	ReadAt      *time.Time `db:"read_at" json:"readAt"`
	CreatedAt   time.Time  `db:"created_at" json:"createdAt"`
}

// ActivityLog entry
type ActivityLog struct {
	ID           int        `db:"id" json:"id"`
	UserID       int        `db:"user_id" json:"userId"`
	ActivityType string     `db:"activity_type" json:"activityType"`
	Details      string     `db:"details" json:"details"`
	CreatedAt    time.Time  `db:"created_at" json:"createdAt"`
}
