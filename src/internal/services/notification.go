package services

import (
	"database/sql"
	"log"
)

// NotificationService handles creating and dispatching notifications.
type NotificationService struct {
	db *sql.DB
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(db *sql.DB) *NotificationService {
	return &NotificationService{db: db}
}

// MarkDueNotificationsSent marks scheduled notifications as sent.
func (s *NotificationService) MarkDueNotificationsSent() {
	result, err := s.db.Exec(`
		UPDATE notifications
		SET sent_at = now()
		WHERE scheduled_at <= now()
		  AND sent_at IS NULL
		  AND read_at IS NULL`)
	if err != nil {
		log.Printf("NotificationService: error marking due notifications: %v", err)
		return
	}
	n, _ := result.RowsAffected()
	if n > 0 {
		log.Printf("NotificationService: dispatched %d notifications", n)
	}
}

// GenerateWateringReminders creates watering notifications for gardens
// that haven't had their soil updated in the last 2 days.
func (s *NotificationService) GenerateWateringReminders() {
	rows, err := s.db.Query(`
		SELECT g.id::text, g.user_id, g.name
		FROM gardens g
		WHERE NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.garden_id=g.id
			  AND n.type='watering'
			  AND n.created_at > now() - INTERVAL '1 day'
		)
		AND NOT EXISTS (
			SELECT 1 FROM soil_cells sc
			WHERE sc.garden_id=g.id
			  AND sc.recorded_at > now() - INTERVAL '2 days'
		)`)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var gid, gname string
		var uid int
		if err := rows.Scan(&gid, &uid, &gname); err != nil {
			continue
		}
		s.db.Exec(`
			INSERT INTO notifications (user_id, garden_id, type, title, body, scheduled_at)
			VALUES ($1, $2::uuid, 'watering', $3, $4, now())`,
			uid, gid,
			"Time to water: "+gname,
			"Your garden "+gname+" may need watering. Check your soil moisture levels.",
		)
	}
}

// GenerateHarvestReminders flags upcoming harvests in the next 3 days.
func (s *NotificationService) GenerateHarvestReminders() {
	rows, err := s.db.Query(`
		SELECT pp.garden_id::text, g.user_id, p.name,
			(pp.planted_date + p.harvest_days * INTERVAL '1 day')::text AS harvest_date
		FROM plant_placements pp
		JOIN plants p ON p.id=pp.plant_id
		JOIN gardens g ON g.id=pp.garden_id
		WHERE (pp.planted_date + p.harvest_days * INTERVAL '1 day') BETWEEN now() AND now() + INTERVAL '3 days'
		AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.garden_id=pp.garden_id
			  AND n.plant_id=pp.plant_id
			  AND n.type='harvest'
			  AND n.created_at > now() - INTERVAL '1 day'
		)`)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var gid, plantName, harvestDate string
		var uid int
		if err := rows.Scan(&gid, &uid, &plantName, &harvestDate); err != nil {
			continue
		}
		s.db.Exec(`
			INSERT INTO notifications (user_id, garden_id, type, title, body, scheduled_at)
			VALUES ($1, $2::uuid, 'harvest', $3, $4, now())`,
			uid, gid,
			"Harvest ready: "+plantName,
			"Your "+plantName+" should be ready to harvest around "+harvestDate+".",
		)
	}
}
