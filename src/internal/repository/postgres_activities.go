package repository

import (
	"database/sql"

	"garden-planner/internal/database"
)

type pgActivityRepo struct{ db *sql.DB }

func (r *pgActivityRepo) Log(userID int, activityType, details string) error {
	_, err := r.db.Exec(
		`INSERT INTO activity_logs (user_id, activity_type, details, created_at)
		 VALUES($1,$2,$3,now())`,
		userID, activityType, details,
	)
	return err
}

func (r *pgActivityRepo) List(limit, offset int) ([]database.ActivityLog, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, activity_type, details, created_at
		 FROM activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []database.ActivityLog
	for rows.Next() {
		var l database.ActivityLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.ActivityType, &l.Details, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (r *pgActivityRepo) Count() (int, error) {
	var n int
	return n, r.db.QueryRow(`SELECT COUNT(*) FROM activity_logs`).Scan(&n)
}
