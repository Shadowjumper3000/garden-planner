package repository

import "database/sql"

// NewUserRepo returns a PostgreSQL-backed UserRepository.
func NewUserRepo(db *sql.DB) UserRepository { return &pgUserRepo{db} }

// NewGardenRepo returns a PostgreSQL-backed GardenRepository.
func NewGardenRepo(db *sql.DB) GardenRepository { return &pgGardenRepo{db} }

// NewPlantRepo returns a PostgreSQL-backed PlantRepository.
func NewPlantRepo(db *sql.DB) PlantRepository { return &pgPlantRepo{db} }

// NewNotificationRepo returns a PostgreSQL-backed NotificationRepository.
func NewNotificationRepo(db *sql.DB) NotificationRepository { return &pgNotificationRepo{db} }

// NewActivityRepo returns a PostgreSQL-backed ActivityRepository.
func NewActivityRepo(db *sql.DB) ActivityRepository { return &pgActivityRepo{db} }

// New wires all PostgreSQL repositories into a Repositories container.
func New(db *sql.DB) Repositories {
	return Repositories{
		Users:         NewUserRepo(db),
		Gardens:       NewGardenRepo(db),
		Plants:        NewPlantRepo(db),
		Notifications: NewNotificationRepo(db),
		Activities:    NewActivityRepo(db),
	}
}