// Package repository defines the data-access abstractions used throughout the
// application. Handlers depend only on these interfaces (Dependency Inversion),
// enabling easy testing and alternative storage back-ends (Open/Closed).
package repository

import (
	"database/sql"
	"time"

	"garden-planner/internal/database"
)

// ─── User ─────────────────────────────────────────────────────────────────────

// UserRepository covers all user persistence operations.
type UserRepository interface {
	GetByEmail(email string) (*database.User, error)
	GetByID(id int) (*database.User, error)
	Create(name, email, passwordHash, role string) (*database.User, error)
	List(limit, offset int) ([]database.User, error)
	SetRole(id int, role string) error
	Count() (int, error)
}

// ─── Garden ───────────────────────────────────────────────────────────────────

// GardenRepository covers garden CRUD and soil operations.
type GardenRepository interface {
	List(userID int) ([]database.Garden, error)
	Get(id string, userID int) (*database.Garden, error)
	Create(g *database.Garden) (*database.Garden, error)
	Update(g *database.Garden) (*database.Garden, error)
	Delete(id string, userID int) error

	// Soil
	GetSoilCells(gardenID string) ([]database.SoilCell, error)
	UpsertSoilCell(cell *database.SoilCell) error
	GetSoilHistory(gardenID string, limit int) ([]database.SoilHistory, error)
	SnapshotSoil(gardenID string, cells []database.SoilCell) error

	// Plant placements
	GetPlacements(gardenID string) ([]database.PlantPlacement, error)
	AddPlacement(p *database.PlantPlacement) (*database.PlantPlacement, error)
	RemovePlacement(gardenID string, row, col int) error
}

// ─── Plant ────────────────────────────────────────────────────────────────────

// PlantRepository covers plant library operations.
type PlantRepository interface {
	List(limit, offset int) ([]database.Plant, error)
	ListPublic(limit, offset int) ([]database.Plant, error)
	ListByUser(userID int) ([]database.Plant, error)
	ListRecent(days, limit int) ([]database.Plant, error)
	Get(id string) (*database.Plant, error)
	Create(p *database.Plant) (*database.Plant, error)
	Update(p *database.Plant) (*database.Plant, error)
	Delete(id string, userID int) error
	Copy(sourceID string, newOwnerID int) (*database.Plant, error)

	// Relationships
	GetRelationships(plantID string) ([]database.PlantRelationship, error)
	UpsertRelationship(r *database.PlantRelationship) error

	Count() (int, error)
}

// ─── Notification ─────────────────────────────────────────────────────────────

// NotificationRepository covers notification persistence.
type NotificationRepository interface {
	List(userID int, unreadOnly bool, limit int) ([]database.Notification, error)
	Get(id string) (*database.Notification, error)
	Create(n *database.Notification) (*database.Notification, error)
	MarkRead(id string, userID int) error
	MarkAllRead(userID int) error
	Delete(id string, userID int) error
	MarkDueSent(now time.Time) (int64, error)
	CountUnread(userID int) (int, error)
}

// ─── Activity ─────────────────────────────────────────────────────────────────

// ActivityRepository logs user actions for auditing.
type ActivityRepository interface {
	Log(userID int, action, entityType, entityID, details string) error
	List(limit, offset int) ([]database.ActivityLog, error)
	Count() (int, error)
}

// ─── Factories ────────────────────────────────────────────────────────────────

// Repositories is a dependency injection container passed to all handlers.
// Each field is an interface so implementations can be swapped (e.g. in tests).
type Repositories struct {
	Users         UserRepository
	Gardens       GardenRepository
	Plants        PlantRepository
	Notifications NotificationRepository
	Activities    ActivityRepository
}

// NewPostgres builds a Repositories backed by a *sql.DB connection.
func NewPostgres(db *sql.DB) *Repositories {
	return &Repositories{
		Users:         &pgUserRepo{db},
		Gardens:       &pgGardenRepo{db},
		Plants:        &pgPlantRepo{db},
		Notifications: &pgNotificationRepo{db},
		Activities:    &pgActivityRepo{db},
	}
}
