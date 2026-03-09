package repository

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	"garden-planner/internal/database"
)

type pgGardenRepo struct{ db *sql.DB }

// ─── Gardens ──────────────────────────────────────────────────────────────────────────────
func (r *pgGardenRepo) List(userID int) ([]database.Garden, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, name, width_m, height_m, created_at
		 FROM gardens WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var gs []database.Garden
	for rows.Next() {
		var g database.Garden
		if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt); err != nil {
			return nil, err
		}
		gs = append(gs, g)
	}
	return gs, rows.Err()
}

func (r *pgGardenRepo) Get(id string, userID int) (*database.Garden, error) {
	g := &database.Garden{}
	err := r.db.QueryRow(
		`SELECT id, user_id, name, width_m, height_m, created_at
		 FROM gardens WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return g, err
}

func (r *pgGardenRepo) Create(g *database.Garden) (*database.Garden, error) {
	g.ID = uuid.New().String()
	err := r.db.QueryRow(
		`INSERT INTO gardens (id, user_id, name, width_m, height_m, created_at)
		 VALUES ($1, $2, $3, $4, $5, now())
		 RETURNING id, user_id, name, width_m, height_m, created_at`,
		g.ID, g.UserID, g.Name, g.WidthM, g.HeightM,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
	return g, err
}

func (r *pgGardenRepo) Update(g *database.Garden) (*database.Garden, error) {
	err := r.db.QueryRow(
		`UPDATE gardens SET name = $1, width_m = $2, height_m = $3
		 WHERE id = $4 AND user_id = $5
		 RETURNING id, user_id, name, width_m, height_m, created_at`,
		g.Name, g.WidthM, g.HeightM, g.ID, g.UserID,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
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

// ─── Soil ──────────────────────────────────────────────────────────────────────────────────
func (r *pgGardenRepo) GetSoilCells(gardenID string) ([]database.SoilCell, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, x_m, y_m, moisture, nitrogen, phosphorus, potassium, ph, recorded_at
		 FROM soil_cells WHERE garden_id = $1 ORDER BY y_m, x_m`, gardenID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cells []database.SoilCell
	for rows.Next() {
		var c database.SoilCell
		if err := rows.Scan(&c.ID, &c.GardenID, &c.XM, &c.YM, &c.Moisture, &c.Nitrogen, &c.Phosphorus, &c.Potassium, &c.PH, &c.RecordedAt); err != nil {
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
		`INSERT INTO soil_cells (id, garden_id, x_m, y_m, moisture, nitrogen, phosphorus, potassium, ph, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		 ON CONFLICT (garden_id, x_m, y_m)
		 DO UPDATE SET moisture=$5, nitrogen=$6, phosphorus=$7, potassium=$8, ph=$9, recorded_at=now()`,
		cell.ID, cell.GardenID, cell.XM, cell.YM,
		cell.Moisture, cell.Nitrogen, cell.Phosphorus, cell.Potassium, cell.PH,
	)
	return err
}

func (r *pgGardenRepo) GetSoilHistory(gardenID string, limit int) ([]database.SoilHistory, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, snapshot, recorded_at
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
		if err := rows.Scan(&h.ID, &h.GardenID, &h.Snapshot, &h.RecordedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, rows.Err()
}

func (r *pgGardenRepo) SnapshotSoil(gardenID string, cells []database.SoilCell) error {
	snap := fmt.Sprintf(`{"cells":%d}`, len(cells))
	_, err := r.db.Exec(
		`INSERT INTO soil_history (id, garden_id, snapshot, recorded_at) VALUES ($1, $2, $3, now())`,
		uuid.New().String(), gardenID, snap,
	)
	return err
}

// ─── Plant placements ────────────────────────────────────────────────────────

func (r *pgGardenRepo) GetPlacements(gardenID string) ([]database.PlantPlacement, error) {
	rows, err := r.db.Query(
		`SELECT id, garden_id, plant_id, x_m, y_m, width_m, height_m, planted_date
		 FROM plant_placements WHERE garden_id = $1`, gardenID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var placements []database.PlantPlacement
	for rows.Next() {
		var p database.PlantPlacement
		if err := rows.Scan(&p.ID, &p.GardenID, &p.PlantID, &p.XM, &p.YM, &p.WidthM, &p.HeightM, &p.PlantedDate); err != nil {
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
		`INSERT INTO plant_placements (id, garden_id, plant_id, x_m, y_m, width_m, height_m, planted_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		p.ID, p.GardenID, p.PlantID, p.XM, p.YM, p.WidthM, p.HeightM, p.PlantedDate,
	)
	return p, err
}

func (r *pgGardenRepo) RemovePlacement(gardenID, placementID string) error {
	_, err := r.db.Exec(
		`DELETE FROM plant_placements WHERE id = $1 AND garden_id = $2`,
		placementID, gardenID,
	)
	return err
}

