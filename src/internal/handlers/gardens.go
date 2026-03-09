package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"garden-planner/internal/middleware"
)

type gardenRow struct {
	ID        string `json:"id"`
	UserID    int    `json:"userId"`
	Name      string `json:"name"`
	Rows      int    `json:"rows"`
	Columns   int    `json:"columns"`
	CreatedAt string `json:"createdAt"`
}

type gardenResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Rows      int             `json:"rows"`
	Columns   int             `json:"columns"`
	CreatedAt string          `json:"createdAt"`
	Plants    []plantPlaceOut `json:"plants"`
	SoilData  soilDataOut     `json:"soilData"`
}

type plantPlaceOut struct {
	PlantID     string   `json:"plantId"`
	PlantedDate string   `json:"plantedDate"`
	Position    posOut   `json:"position"`
}

type posOut struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

type soilDataOut struct {
	Cells       [][]soilCellOut `json:"cells"`
	LastUpdated string          `json:"lastUpdated"`
}

type soilCellOut struct {
	Moisture   float64 `json:"moisture"`
	Nitrogen   float64 `json:"nitrogen"`
	Phosphorus float64 `json:"phosphorus"`
	Potassium  float64 `json:"potassium"`
	PH         float64 `json:"ph"`
}

func hydrateGarden(db *sql.DB, g gardenRow) (gardenResponse, error) {
	resp := gardenResponse{
		ID:        g.ID,
		Name:      g.Name,
		Rows:      g.Rows,
		Columns:   g.Columns,
		CreatedAt: g.CreatedAt,
		Plants:    []plantPlaceOut{},
	}

	// Build default soil cells
	cells := make([][]soilCellOut, g.Rows)
	for i := range cells {
		cells[i] = make([]soilCellOut, g.Columns)
		for j := range cells[i] {
			cells[i][j] = soilCellOut{Moisture: 50, Nitrogen: 50, Phosphorus: 50, Potassium: 50, PH: 7}
		}
	}

	// Load actual soil cells
	rows, err := db.Query(
		`SELECT row_idx, col_idx, moisture, nitrogen, phosphorus, potassium, ph FROM soil_cells WHERE garden_id=$1`,
		g.ID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ri, ci int
			var m, n, p, k, ph float64
			if err := rows.Scan(&ri, &ci, &m, &n, &p, &k, &ph); err == nil {
				if ri < g.Rows && ci < g.Columns {
					cells[ri][ci] = soilCellOut{Moisture: m, Nitrogen: n, Phosphorus: p, Potassium: k, PH: ph}
				}
			}
		}
	}

	// Last updated timestamp
	var lastUpdated string
	db.QueryRow(`SELECT COALESCE(MAX(recorded_at::text), $2) FROM soil_cells WHERE garden_id=$1`, g.ID, g.CreatedAt).Scan(&lastUpdated)
	if lastUpdated == "" {
		lastUpdated = g.CreatedAt
	}

	resp.SoilData = soilDataOut{Cells: cells, LastUpdated: lastUpdated}

	// Load plant placements
	placements, err := db.Query(
		`SELECT plant_id, row_idx, col_idx, planted_date::text FROM plant_placements WHERE garden_id=$1`,
		g.ID,
	)
	if err == nil {
		defer placements.Close()
		for placements.Next() {
			var plantID, plantedDate string
			var ri, ci int
			if err := placements.Scan(&plantID, &ri, &ci, &plantedDate); err == nil {
				resp.Plants = append(resp.Plants, plantPlaceOut{
					PlantID:     plantID,
					PlantedDate: plantedDate,
					Position:    posOut{Row: ri, Col: ci},
				})
			}
		}
	}

	return resp, nil
}

// ListGardens returns all gardens for the authenticated user.
func ListGardens(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		rows, err := db.Query(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE user_id=$1 ORDER BY created_at DESC`,
			uid,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var result []gardenResponse
		for rows.Next() {
			var g gardenRow
			if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt); err != nil {
				continue
			}
			gr, err := hydrateGarden(db, g)
			if err == nil {
				result = append(result, gr)
			}
		}
		if result == nil {
			result = []gardenResponse{}
		}
		respondJSON(w, http.StatusOK, result)
	}
}

// GetGarden returns a single garden by ID.
func GetGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")
		var g gardenRow
		err := db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1 AND user_id=$2`,
			id, uid,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "garden not found")
			return
		} else if err != nil {
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}
		gr, err := hydrateGarden(db, g)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}
		respondJSON(w, http.StatusOK, gr)
	}
}

type createGardenReq struct {
	Name    string `json:"name"`
	Rows    int    `json:"rows"`
	Columns int    `json:"columns"`
}

// CreateGarden creates a new garden.
func CreateGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req createGardenReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.Rows <= 0 {
			req.Rows = 5
		}
		if req.Columns <= 0 {
			req.Columns = 5
		}

		var gid string
		err := db.QueryRow(
			`INSERT INTO gardens (user_id, name, rows, columns) VALUES ($1,$2,$3,$4) RETURNING id::text`,
			uid, req.Name, req.Rows, req.Columns,
		).Scan(&gid)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not create garden")
			return
		}

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1`,
			gid,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)

		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusCreated, gr)
	}
}

type updateGardenReq struct {
	Name    string `json:"name"`
	Rows    int    `json:"rows"`
	Columns int    `json:"columns"`
}

// UpdateGarden updates a garden's metadata.
func UpdateGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")
		var req updateGardenReq
		json.NewDecoder(r.Body).Decode(&req)

		_, err := db.Exec(
			`UPDATE gardens SET name=$1, rows=$2, columns=$3, updated_at=now() WHERE id=$4 AND user_id=$5`,
			req.Name, req.Rows, req.Columns, id, uid,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "update failed")
			return
		}
		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1`,
			id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

// DeleteGarden removes a garden.
func DeleteGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")
		db.Exec(`DELETE FROM gardens WHERE id=$1 AND user_id=$2`, id, uid)
		w.WriteHeader(http.StatusNoContent)
	}
}

// UpdateSoil updates soil cells for a garden (bulk).
func UpdateSoil(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		// Verify ownership
		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, id).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		var body struct {
			SoilData struct {
				Cells [][]struct {
					Moisture   float64 `json:"moisture"`
					Nitrogen   float64 `json:"nitrogen"`
					Phosphorus float64 `json:"phosphorus"`
					Potassium  float64 `json:"potassium"`
					PH         float64 `json:"ph"`
				} `json:"cells"`
			} `json:"soilData"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}

		for ri, row := range body.SoilData.Cells {
			for ci, cell := range row {
				db.Exec(`
					INSERT INTO soil_cells (garden_id, row_idx, col_idx, moisture, nitrogen, phosphorus, potassium, ph, recorded_at)
					VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
					ON CONFLICT (garden_id, row_idx, col_idx) DO UPDATE
					SET moisture=$4, nitrogen=$5, phosphorus=$6, potassium=$7, ph=$8, recorded_at=now()`,
					id, ri, ci, cell.Moisture, cell.Nitrogen, cell.Phosphorus, cell.Potassium, cell.PH,
				)
			}
		}

		// Snapshot to history
		snapshotJSON, _ := json.Marshal(body.SoilData.Cells)
		db.Exec(`INSERT INTO soil_history (garden_id, row_idx, col_idx, snapshot) VALUES ($1,0,0,$2)`, id, snapshotJSON)

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1`, id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

type soilHistoryEntry struct {
	RecordedAt string          `json:"recordedAt"`
	Cells      json.RawMessage `json:"cells"`
	AvgMoisture   float64 `json:"avgMoisture"`
	AvgNitrogen   float64 `json:"avgNitrogen"`
	AvgPhosphorus float64 `json:"avgPhosphorus"`
	AvgPotassium  float64 `json:"avgPotassium"`
}

// GetSoilHistory returns soil snapshots for the scroll-wheel calendar.
func GetSoilHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, id).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		limit := 90
		if l := r.URL.Query().Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil {
				limit = n
			}
		}

		rows, err := db.Query(`
			SELECT recorded_at::text, snapshot
			FROM soil_history
			WHERE garden_id=$1
			ORDER BY recorded_at DESC
			LIMIT $2`, id, limit)
		if err != nil {
			respondJSON(w, http.StatusOK, []soilHistoryEntry{})
			return
		}
		defer rows.Close()

		var result []soilHistoryEntry
		for rows.Next() {
			var ts string
			var snap []byte
			if err := rows.Scan(&ts, &snap); err != nil {
				continue
			}
			result = append(result, soilHistoryEntry{
				RecordedAt: ts,
				Cells:      json.RawMessage(snap),
			})
		}
		if result == nil {
			result = []soilHistoryEntry{}
		}
		respondJSON(w, http.StatusOK, result)
	}
}

// AddPlantToGarden places a plant in a garden grid cell.
func AddPlantToGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, id).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		var req struct {
			PlantID  string `json:"plantId"`
			Date     string `json:"date"`
			Position struct {
				Row int `json:"row"`
				Col int `json:"col"`
			} `json:"position"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}

		if req.Date == "" {
			req.Date = "today"
		}

		_, err = db.Exec(`
			INSERT INTO plant_placements (garden_id, plant_id, row_idx, col_idx, planted_date)
			VALUES ($1,$2,$3,$4,$5::date)
			ON CONFLICT (garden_id, row_idx, col_idx) DO UPDATE
			SET plant_id=$2, planted_date=$5::date`,
			id, req.PlantID, req.Position.Row, req.Position.Col, req.Date,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not place plant: "+err.Error())
			return
		}

		// Apply soil influence from plant
		db.Exec(`
			INSERT INTO soil_cells (garden_id, row_idx, col_idx, nitrogen, phosphorus, potassium, recorded_at)
			SELECT $1, $2, $3,
				LEAST(100, GREATEST(0, COALESCE(sc.nitrogen,50) + p.nitrogen_impact)),
				LEAST(100, GREATEST(0, COALESCE(sc.phosphorus,50) + p.phosphorus_impact)),
				LEAST(100, GREATEST(0, COALESCE(sc.potassium,50) + p.potassium_impact)),
				now()
			FROM plants p
			LEFT JOIN soil_cells sc ON sc.garden_id=$1 AND sc.row_idx=$2 AND sc.col_idx=$3
			WHERE p.id=$4
			ON CONFLICT (garden_id, row_idx, col_idx) DO UPDATE
			SET nitrogen=EXCLUDED.nitrogen, phosphorus=EXCLUDED.phosphorus, potassium=EXCLUDED.potassium, recorded_at=now()`,
			id, req.Position.Row, req.Position.Col, req.PlantID,
		)

		// Schedule harvest notification
		db.Exec(`
			INSERT INTO notifications (user_id, garden_id, plant_id, type, title, body, scheduled_at)
			SELECT $1, $2::uuid, $3::uuid, 'harvest',
				'Harvest ready: ' || p.name,
				'Your ' || p.name || ' planted on ' || $4 || ' should be ready to harvest.',
				($4::date + p.harvest_days * INTERVAL '1 day')
			FROM plants p WHERE p.id=$3`,
			uid, id, req.PlantID, req.Date,
		)

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1`, id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

// RemovePlantFromGarden removes a plant placement.
func RemovePlantFromGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, id).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		rowQ := r.URL.Query().Get("row")
		colQ := r.URL.Query().Get("col")
		row, _ := strconv.Atoi(rowQ)
		col, _ := strconv.Atoi(colQ)

		db.Exec(`DELETE FROM plant_placements WHERE garden_id=$1 AND row_idx=$2 AND col_idx=$3`, id, row, col)

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, rows, columns, created_at::text FROM gardens WHERE id=$1`, id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.Rows, &g.Columns, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}
