package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"garden-planner/internal/database"
)

type pgNotificationRepo struct{ db *sql.DB }

const notifCols = `id, user_id, garden_id, plant_id, type, title, body, scheduled_at, sent_at, read_at, created_at`

func scanNotification(row interface{ Scan(...any) error }) (*database.Notification, error) {
	n := &database.Notification{}
	return n, row.Scan(
		&n.ID, &n.UserID, &n.GardenID, &n.PlantID,
		&n.Type, &n.Title, &n.Body,
		&n.ScheduledAt, &n.SentAt, &n.ReadAt, &n.CreatedAt,
	)
}

func (r *pgNotificationRepo) List(userID int, unreadOnly bool, limit int) ([]database.Notification, error) {
	q := fmt.Sprintf(`SELECT %s FROM notifications WHERE user_id=$1`, notifCols)
	if unreadOnly {
		q += ` AND read_at IS NULL`
	}
	q += ` ORDER BY created_at DESC`
	if limit > 0 {
		q += fmt.Sprintf(` LIMIT %d`, limit)
	}
	rows, err := r.db.Query(q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ns []database.Notification
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		ns = append(ns, *n)
	}
	return ns, rows.Err()
}

func (r *pgNotificationRepo) Get(id string) (*database.Notification, error) {
	n, err := scanNotification(r.db.QueryRow(
		fmt.Sprintf(`SELECT %s FROM notifications WHERE id=$1`, notifCols), id,
	))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return n, err
}

func (r *pgNotificationRepo) Create(n *database.Notification) (*database.Notification, error) {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	result, err := scanNotification(r.db.QueryRow(
		fmt.Sprintf(`INSERT INTO notifications (id, user_id, garden_id, plant_id, type, title, body, scheduled_at, created_at)
		 VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())
		 RETURNING %s`, notifCols),
		n.ID, n.UserID, n.GardenID, n.PlantID, n.Type, n.Title, n.Body, n.ScheduledAt,
	))
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *pgNotificationRepo) MarkRead(id string, userID int) error {
	_, err := r.db.Exec(
		`UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 AND read_at IS NULL`,
		id, userID,
	)
	return err
}

func (r *pgNotificationRepo) MarkAllRead(userID int) error {
	_, err := r.db.Exec(
		`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`,
		userID,
	)
	return err
}

func (r *pgNotificationRepo) Delete(id string, userID int) error {
	_, err := r.db.Exec(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func (r *pgNotificationRepo) MarkDueSent(now time.Time) (int64, error) {
	res, err := r.db.Exec(
		`UPDATE notifications SET sent_at=$1
		 WHERE scheduled_at <= $1 AND sent_at IS NULL AND read_at IS NULL`,
		now,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *pgNotificationRepo) CountUnread(userID int) (int, error) {
	var n int
	return n, r.db.QueryRow(
		`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND read_at IS NULL`, userID,
	).Scan(&n)
}
