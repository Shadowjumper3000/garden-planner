package repository

import (
	"database/sql"

	"garden-planner/internal/database"
)

type pgUserRepo struct{ db *sql.DB }

func (r *pgUserRepo) GetByEmail(email string) (*database.User, error) {
	u := &database.User{}
	err := r.db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

func (r *pgUserRepo) GetByID(id int) (*database.User, error) {
	u := &database.User{}
	err := r.db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

func (r *pgUserRepo) Create(name, email, passwordHash, role string) (*database.User, error) {
	u := &database.User{}
	err := r.db.QueryRow(
		`INSERT INTO users (name, email, password_hash, role, created_at)
		 VALUES ($1, $2, $3, $4, now())
		 RETURNING id, name, email, password_hash, role, created_at`,
		name, email, passwordHash, role,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	return u, err
}

func (r *pgUserRepo) List(limit, offset int) ([]database.User, error) {
	rows, err := r.db.Query(
		`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []database.User
	for rows.Next() {
		var u database.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *pgUserRepo) SetRole(id int, role string) error {
	_, err := r.db.Exec(`UPDATE users SET role = $1 WHERE id = $2`, role, id)
	return err
}

func (r *pgUserRepo) Count() (int, error) {
	var n int
	return n, r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n)
}
