package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"garden-planner/internal/database"
)

// ─── User repository ──────────────────────────────────────────────────────────

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

// ─── Garden repository ────────────────────────────────────────────────────────

type pgGardenRepo struct{ db *sql.DB }

func (r *pgGardenRepo) List(userID int) ([]database.Garden, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, name, rows, columns, created_at, updated_at
		 FROM gardens WHERE user_id = $1 ORDER BY updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var gs []database.Garden
	for rows.Next() {
		var g database.Garden
		if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		gs = append(gs, g)
	}
	return gs, rows.Err()
}

func (r *pgGardenRepo) Get(id string, userID int) (*database.Garden, error) {
	g := &database.Garden{}
	err := r.db.QueryRow(
		`SELECT id, user_id, name, rows, columns, created_at, updated_at
		 FROM gardens WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return g, err
}

func (r *pgGardenRepo) Create(g *database.Garden) (*database.Garden, error) {
	g.ID = uuid.New().String()
	err := r.db.QueryRow(
		`INSERT INTO gardens (id, user_id, name, rows, columns, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, now(), now())
		 RETURNING id, user_id, name, rows, columns, created_at, updated_at`,
		g.ID, g.UserID, g.Name, g.Rows, g.Columns,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}

func (r *pgGardenRepo) Update(g *database.Garden) (*database.Garden, error) {
	err := r.db.QueryRow(
		`UPDATE gardens SET name = $1, rows = $2, columns = $3, updated_at = now()
		 WHERE id = $4 AND user_id = $5
		 RETURNING id, user_id, name, rows, columns, created_at, updated_at`,
		g.Name, g.Rows, g.Columns, g.ID, g.UserID,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return g, err
}

func (r *pgGardenRepo) Delete(id string, userID int) error {
	res, err := r.db.Exec(`DELETE FROM gardens WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("garden not found")
	}
	return nil
}

func (r *pgGardenRepo) GetSoilCells(gardenID string) ([]database.SoilCell, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, row_idx, col_idx, moisture, nitrogen, phosphorus, potassium, ph, recorded_at
		 FROM soil_cells WHERE garden_id = $1 ORDER BY row_idx, col_idx`, gardenID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cells []database.SoilCell
	for rows.Next() {
		var c database.SoilCell
		if err := rows.Scan(&c.ID, &c.GardenID, &c.RowIdx, &c.ColIdx, &c.Moisture, &c.Nitrogen, &c.Phosphorus, &c.Potassium, &c.PH, &c.RecordedAt); err != nil {
			return nil, err
		}
		cells = append(cells, c)
	}
	return cells, rows.Err()
}

func (r *pgGardenRepo) UpsertSoilCell(cell *database.SoilCell) error {
	if cell.ID == "" {
		cell.ID = uuid.New().String()
	}
	_, err := r.db.Exec(
		`INSERT INTO soil_cells (id, garden_id, row_idx, col_idx, moisture, nitrogen, phosphorus, potassium, ph, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		 ON CONFLICT (garden_id, row_idx, col_idx)
		 DO UPDATE SET moisture=$5, nitrogen=$6, phosphorus=$7, potassium=$8, ph=$9, recorded_at=now()`,
		cell.ID, cell.GardenID, cell.RowIdx, cell.ColIdx,
		cell.Moisture, cell.Nitrogen, cell.Phosphorus, cell.Potassium, cell.PH,
	)
	return err
}

func (r *pgGardenRepo) GetSoilHistory(gardenID string, limit int) ([]database.SoilHistory, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, row_idx, col_idx, snapshot, recorded_at
		 FROM soil_history WHERE garden_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
		gardenID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var history []database.SoilHistory
	for rows.Next() {
		var h database.SoilHistory
		if err := rows.Scan(&h.ID, &h.GardenID, &h.RowIdx, &h.ColIdx, &h.Snapshot, &h.RecordedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, rows.Err()
}

func (r *pgGardenRepo) SnapshotSoil(gardenID string, cells []database.SoilCell) error {
	for _, c := range cells {
		snap := fmt.Sprintf(`{"moisture":%v,"nitrogen":%v,"phosphorus":%v,"potassium":%v,"ph":%v}`,
			c.Moisture, c.Nitrogen, c.Phosphorus, c.Potassium, c.PH)
		_, err := r.db.Exec(
			`INSERT INTO soil_history (id, garden_id, row_idx, col_idx, snapshot, recorded_at)
			 VALUES ($1, $2, $3, $4, $5, now())`,
			uuid.New().String(), gardenID, c.RowIdx, c.ColIdx, snap,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *pgGardenRepo) GetPlacements(gardenID string) ([]database.PlantPlacement, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, plant_id, row_idx, col_idx, planted_date, harvest_date
		 FROM plant_placements WHERE garden_id = $1`, gardenID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var placements []database.PlantPlacement
	for rows.Next() {
		var p database.PlantPlacement
		if err := rows.Scan(&p.ID, &p.GardenID, &p.PlantID, &p.RowIdx, &p.ColIdx, &p.PlantedDate, &p.HarvestDate); err != nil {
			return nil, err
		}
		placements = append(placements, p)
	}
	return placements, rows.Err()
}

func (r *pgGardenRepo) AddPlacement(p *database.PlantPlacement) (*database.PlantPlacement, error) {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	_, err := r.db.Exec(
		`INSERT INTO plant_placements (id, garden_id, plant_id, row_idx, col_idx, planted_date, harvest_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (garden_id, row_idx, col_idx)
		 DO UPDATE SET plant_id=$3, planted_date=$6, harvest_date=$7`,
		p.ID, p.GardenID, p.PlantID, p.RowIdx, p.ColIdx, p.PlantedDate, p.HarvestDate,
	)
	return p, err
}

func (r *pgGardenRepo) RemovePlacement(gardenID string, row, col int) error {
	_, err := r.db.Exec(
		`DELETE FROM plant_placements WHERE garden_id = $1 AND row_idx = $2 AND col_idx = $3`,
		gardenID, row, col,
	)
	return err
}

// ─── Plant repository ─────────────────────────────────────────────────────────

type pgPlantRepo struct{ db *sql.DB }

func scanPlant(row interface{ Scan(...any) error }) (*database.Plant, error) {
	p := &database.Plant{}
	return p, row.Scan(
		&p.ID, &p.CreatorID, &p.Name, &p.Description, &p.ImageURL,
		&p.NitrogenImpact, &p.PhosphorusImpact, &p.PotassiumImpact, &p.PHImpact,
		&p.GerminationDays, &p.MaturityDays, &p.HarvestDays, &p.IsPublic, &p.CreatedAt,
	)
}

const plantCols = `id, creator_id, name, description, image_url,
  nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact,
  germination_days, maturity_days, harvest_days, is_public, created_at`

func (r *pgPlantRepo) List(limit, offset int) ([]database.Plant, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT %s FROM plants ORDER BY name LIMIT $1 OFFSET $2`, plantCols), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlants(rows)
}

func (r *pgPlantRepo) ListPublic(limit, offset int) ([]database.Plant, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT %s FROM plants WHERE is_public=true ORDER BY name LIMIT $1 OFFSET $2`, plantCols), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlants(rows)
}

func (r *pgPlantRepo) ListByUser(userID int) ([]database.Plant, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT %s FROM plants WHERE creator_id=$1 ORDER BY name`, plantCols), userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlants(rows)
}

func (r *pgPlantRepo) ListRecent(days, limit int) ([]database.Plant, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT %s FROM plants WHERE created_at > now()-$1::interval ORDER BY created_at DESC LIMIT $2`, plantCols),
		fmt.Sprintf("%d days", days), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlants(rows)
}

func scanPlants(rows *sql.Rows) ([]database.Plant, error) {
	var plants []database.Plant
	for rows.Next() {
		p, err := scanPlant(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *p)
	}
	return plants, rows.Err()
}

func (r *pgPlantRepo) Get(id string) (*database.Plant, error) {
	p, err := scanPlant(r.db.QueryRow(fmt.Sprintf(`SELECT %s FROM plants WHERE id=$1`, plantCols), id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *pgPlantRepo) Create(p *database.Plant) (*database.Plant, error) {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	err := r.db.QueryRow(
		fmt.Sprintf(`INSERT INTO plants (id,creator_id,name,description,image_url,nitrogen_impact,phosphorus_impact,potassium_impact,ph_impact,germination_days,maturity_days,harvest_days,is_public,created_at)
		 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) RETURNING %s`, plantCols),
		p.ID, p.CreatorID, p.Name, p.Description, p.ImageURL,
		p.NitrogenImpact, p.PhosphorusImpact, p.PotassiumImpact, p.PHImpact,
		p.GerminationDays, p.MaturityDays, p.HarvestDays, p.IsPublic,
	).Scan(
		&p.ID, &p.CreatorID, &p.Name, &p.Description, &p.ImageURL,
		&p.NitrogenImpact, &p.PhosphorusImpact, &p.PotassiumImpact, &p.PHImpact,
		&p.GerminationDays, &p.MaturityDays, &p.HarvestDays, &p.IsPublic, &p.CreatedAt,
	)
	return p, err
}

func (r *pgPlantRepo) Update(p *database.Plant) (*database.Plant, error) {
	err := r.db.QueryRow(
		fmt.Sprintf(`UPDATE plants SET name=$1,description=$2,image_url=$3,nitrogen_impact=$4,phosphorus_impact=$5,
		 potassium_impact=$6,ph_impact=$7,germination_days=$8,maturity_days=$9,harvest_days=$10,is_public=$11
		 WHERE id=$12 AND (creator_id=$13 OR $13=0) RETURNING %s`, plantCols),
		p.Name, p.Description, p.ImageURL, p.NitrogenImpact, p.PhosphorusImpact,
		p.PotassiumImpact, p.PHImpact, p.GerminationDays, p.MaturityDays, p.HarvestDays,
		p.IsPublic, p.ID, p.CreatorID,
	).Scan(
		&p.ID, &p.CreatorID, &p.Name, &p.Description, &p.ImageURL,
		&p.NitrogenImpact, &p.PhosphorusImpact, &p.PotassiumImpact, &p.PHImpact,
		&p.GerminationDays, &p.MaturityDays, &p.HarvestDays, &p.IsPublic, &p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *pgPlantRepo) Delete(id string, userID int) error {
	_, err := r.db.Exec(`DELETE FROM plants WHERE id=$1 AND creator_id=$2`, id, userID)
	return err
}

func (r *pgPlantRepo) Copy(sourceID string, newOwnerID int) (*database.Plant, error) {
	p, err := r.Get(sourceID)
	if err != nil || p == nil {
		return nil, err
	}
	p.ID = uuid.New().String()
	p.CreatorID = &newOwnerID
	p.IsPublic = false
	return r.Create(p)
}

func (r *pgPlantRepo) GetRelationships(plantID string) ([]database.PlantRelationship, error) {
	rows, err := r.db.Query(
		`SELECT id, plant_a_id, plant_b_id, relationship_type, benefit_description
		 FROM plant_relationships WHERE plant_a_id=$1 OR plant_b_id=$1`, plantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var rels []database.PlantRelationship
	for rows.Next() {
		var rel database.PlantRelationship
		if err := rows.Scan(&rel.ID, &rel.PlantAID, &rel.PlantBID, &rel.RelationshipType, &rel.BenefitDescription); err != nil {
			return nil, err
		}
		rels = append(rels, rel)
	}
	return rels, rows.Err()
}

func (r *pgPlantRepo) UpsertRelationship(rel *database.PlantRelationship) error {
	if rel.ID == "" {
		rel.ID = uuid.New().String()
	}
	_, err := r.db.Exec(
		`INSERT INTO plant_relationships (id, plant_a_id, plant_b_id, relationship_type, benefit_description)
		 VALUES($1,$2,$3,$4,$5)
		 ON CONFLICT (plant_a_id, plant_b_id) DO UPDATE
		 SET relationship_type=$4, benefit_description=$5`,
		rel.ID, rel.PlantAID, rel.PlantBID, rel.RelationshipType, rel.BenefitDescription,
	)
	return err
}

func (r *pgPlantRepo) Count() (int, error) {
	var n int
	return n, r.db.QueryRow(`SELECT COUNT(*) FROM plants`).Scan(&n)
}

// ─── Notification repository ──────────────────────────────────────────────────

type pgNotificationRepo struct{ db *sql.DB }

func (r *pgNotificationRepo) List(userID int, unreadOnly bool, limit int) ([]database.Notification, error) {
	q := `SELECT id, user_id, type, message, is_read, status, scheduled_for, sent_at, created_at
	      FROM notifications WHERE user_id=$1`
	if unreadOnly {
		q += ` AND is_read=false`
	}
	q += ` ORDER BY scheduled_for DESC`
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
		var n database.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Message, &n.IsRead, &n.Status, &n.ScheduledFor, &n.SentAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		ns = append(ns, n)
	}
	return ns, rows.Err()
}

func (r *pgNotificationRepo) Get(id string) (*database.Notification, error) {
	n := &database.Notification{}
	err := r.db.QueryRow(
		`SELECT id, user_id, type, message, is_read, status, scheduled_for, sent_at, created_at FROM notifications WHERE id=$1`, id,
	).Scan(&n.ID, &n.UserID, &n.Type, &n.Message, &n.IsRead, &n.Status, &n.ScheduledFor, &n.SentAt, &n.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return n, err
}

func (r *pgNotificationRepo) Create(n *database.Notification) (*database.Notification, error) {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	err := r.db.QueryRow(
		`INSERT INTO notifications (id, user_id, type, message, is_read, status, scheduled_for, created_at)
		 VALUES($1,$2,$3,$4,false,'scheduled',$5,now())
		 RETURNING id, user_id, type, message, is_read, status, scheduled_for, sent_at, created_at`,
		n.ID, n.UserID, n.Type, n.Message, n.ScheduledFor,
	).Scan(&n.ID, &n.UserID, &n.Type, &n.Message, &n.IsRead, &n.Status, &n.ScheduledFor, &n.SentAt, &n.CreatedAt)
	return n, err
}

func (r *pgNotificationRepo) MarkRead(id string, userID int) error {
	_, err := r.db.Exec(`UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func (r *pgNotificationRepo) MarkAllRead(userID int) error {
	_, err := r.db.Exec(`UPDATE notifications SET is_read=true WHERE user_id=$1 AND is_read=false`, userID)
	return err
}

func (r *pgNotificationRepo) Delete(id string, userID int) error {
	_, err := r.db.Exec(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func (r *pgNotificationRepo) MarkDueSent(now time.Time) (int64, error) {
	res, err := r.db.Exec(
		`UPDATE notifications SET status='sent', sent_at=$1 WHERE status='scheduled' AND scheduled_for <= $1`, now,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *pgNotificationRepo) CountUnread(userID int) (int, error) {
	var n int
	return n, r.db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, userID).Scan(&n)
}

// ─── Activity repository ──────────────────────────────────────────────────────

type pgActivityRepo struct{ db *sql.DB }

func (r *pgActivityRepo) Log(userID int, action, entityType, entityID, details string) error {
	_, err := r.db.Exec(
		`INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
		 VALUES($1,$2,$3,$4,$5,$6,now())`,
		uuid.New().String(), userID, action, entityType, entityID, details,
	)
	return err
}

func (r *pgActivityRepo) List(limit, offset int) ([]database.ActivityLog, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, action, entity_type, entity_id, details, created_at
		 FROM activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []database.ActivityLog
	for rows.Next() {
		var l database.ActivityLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.CreatedAt); err != nil {
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
