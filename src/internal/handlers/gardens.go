package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"garden-planner/internal/middleware"
)

// soilCellResolution is the size of each soil cell in metres
const soilCellResolution = 0.5

type gardenRow struct {
	ID        string  `json:"id"`
	UserID    int     `json:"userId"`
	Name      string  `json:"name"`
	WidthM    float64 `json:"widthM"`
	HeightM   float64 `json:"heightM"`
	CreatedAt string  `json:"createdAt"`
}

type gardenResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	WidthM    float64         `json:"widthM"`
	HeightM   float64         `json:"heightM"`
	CreatedAt string          `json:"createdAt"`
	Plants    []plantPlaceOut `json:"plants"`
	SoilData  soilDataOut     `json:"soilData"`
}

type plantPlaceOut struct {
	ID          string  `json:"id"`
	PlantID     string  `json:"plantId"`
	PlantedDate string  `json:"plantedDate"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	WidthM      float64 `json:"widthM"`
	HeightM     float64 `json:"heightM"`
}

type soilDataOut struct {
	Cells       []soilCellOut `json:"cells"`
	Resolution  float64       `json:"resolution"`
	LastUpdated string        `json:"lastUpdated"`
}

type soilCellOut struct {
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
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
		WidthM:    g.WidthM,
		HeightM:   g.HeightM,
		CreatedAt: g.CreatedAt,
		Plants:    []plantPlaceOut{},
	}

	// Load soil cells (sparse)
	var cells []soilCellOut
	rows, err := db.Query(
		`SELECT x_m, y_m, moisture, nitrogen, phosphorus, potassium, ph FROM soil_cells WHERE garden_id=$1 ORDER BY y_m, x_m`,
		g.ID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c soilCellOut
			if err := rows.Scan(&c.X, &c.Y, &c.Moisture, &c.Nitrogen, &c.Phosphorus, &c.Potassium, &c.PH); err == nil {
				cells = append(cells, c)
			}
		}
	}
	if cells == nil {
		cells = []soilCellOut{}
	}

	// Last updated timestamp
	var lastUpdated string
	db.QueryRow(`SELECT COALESCE(MAX(recorded_at::text), $2) FROM soil_cells WHERE garden_id=$1`, g.ID, g.CreatedAt).Scan(&lastUpdated)
	if lastUpdated == "" {
		lastUpdated = g.CreatedAt
	}

	resp.SoilData = soilDataOut{Cells: cells, Resolution: soilCellResolution, LastUpdated: lastUpdated}

	// Load plant placements
	placements, err := db.Query(
		`SELECT id::text, plant_id::text, x_m, y_m, width_m, height_m, planted_date::text FROM plant_placements WHERE garden_id=$1`,
		g.ID,
	)
	if err == nil {
		defer placements.Close()
		for placements.Next() {
			var pp plantPlaceOut
			if err := placements.Scan(&pp.ID, &pp.PlantID, &pp.X, &pp.Y, &pp.WidthM, &pp.HeightM, &pp.PlantedDate); err == nil {
				resp.Plants = append(resp.Plants, pp)
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
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE user_id=$1 ORDER BY created_at DESC`,
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
			if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt); err != nil {
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
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1 AND user_id=$2`,
			id, uid,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
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
	Name    string  `json:"name"`
	WidthM  float64 `json:"widthM"`
	HeightM float64 `json:"heightM"`
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
		if req.WidthM <= 0 {
			req.WidthM = 5.0
		}
		if req.HeightM <= 0 {
			req.HeightM = 5.0
		}

		var gid string
		err := db.QueryRow(
			`INSERT INTO gardens (user_id, name, width_m, height_m) VALUES ($1,$2,$3,$4) RETURNING id::text`,
			uid, req.Name, req.WidthM, req.HeightM,
		).Scan(&gid)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not create garden")
			return
		}

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`,
			gid,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)

		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusCreated, gr)
	}
}

type updateGardenReq struct {
	Name    string  `json:"name"`
	WidthM  float64 `json:"widthM"`
	HeightM float64 `json:"heightM"`
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

		if req.WidthM <= 0 {
			req.WidthM = 5.0
		}
		if req.HeightM <= 0 {
			req.HeightM = 5.0
		}

		_, err := db.Exec(
			`UPDATE gardens SET name=$1, width_m=$2, height_m=$3, updated_at=now() WHERE id=$4 AND user_id=$5`,
			req.Name, req.WidthM, req.HeightM, id, uid,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "update failed")
			return
		}
		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`,
			id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
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

// UpdateSoil updates soil cells for a garden (sparse list of x/y cells).
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
				Cells []struct {
					X          float64 `json:"x"`
					Y          float64 `json:"y"`
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

		for _, cell := range body.SoilData.Cells {
			db.Exec(`
				INSERT INTO soil_cells (garden_id, x_m, y_m, moisture, nitrogen, phosphorus, potassium, ph, recorded_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
				ON CONFLICT (garden_id, x_m, y_m) DO UPDATE
				SET moisture=$4, nitrogen=$5, phosphorus=$6, potassium=$7, ph=$8, recorded_at=now()`,
				id, cell.X, cell.Y, cell.Moisture, cell.Nitrogen, cell.Phosphorus, cell.Potassium, cell.PH,
			)
		}

		// Snapshot to history
		snapshotJSON, _ := json.Marshal(body.SoilData.Cells)
		db.Exec(`INSERT INTO soil_history (garden_id, snapshot) VALUES ($1,$2)`, id, snapshotJSON)

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`, id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

type soilHistoryEntry struct {
	RecordedAt    string          `json:"recordedAt"`
	Cells         json.RawMessage `json:"cells"`
	AvgMoisture   float64         `json:"avgMoisture"`
	AvgNitrogen   float64         `json:"avgNitrogen"`
	AvgPhosphorus float64         `json:"avgPhosphorus"`
	AvgPotassium  float64         `json:"avgPotassium"`
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

// AddPlantToGarden places a plant at a position (metres) in a garden.
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
			PlantID string  `json:"plantId"`
			Date    string  `json:"date"`
			X       float64 `json:"x"`
			Y       float64 `json:"y"`
			WidthM  float64 `json:"widthM"`
			HeightM float64 `json:"heightM"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}

		if req.Date == "" {
			req.Date = "today"
		}
		if req.WidthM <= 0 {
			req.WidthM = 0.5
		}
		if req.HeightM <= 0 {
			req.HeightM = 0.5
		}

		_, err = db.Exec(`
			INSERT INTO plant_placements (garden_id, plant_id, x_m, y_m, width_m, height_m, planted_date)
			VALUES ($1,$2,$3,$4,$5,$6,$7::date)`,
			id, req.PlantID, req.X, req.Y, req.WidthM, req.HeightM, req.Date,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not place plant: "+err.Error())
			return
		}

		// Apply soil influence to cells that overlap with the plant footprint
		// Snap to 0.5m grid for cell addresses
		xCells := int(req.X / soilCellResolution)
		yCells := int(req.Y / soilCellResolution)
		xEnd := int((req.X + req.WidthM + soilCellResolution - 0.001) / soilCellResolution)
		yEnd := int((req.Y + req.HeightM + soilCellResolution - 0.001) / soilCellResolution)

		for xi := xCells; xi < xEnd; xi++ {
			for yi := yCells; yi < yEnd; yi++ {
				cellX := float64(xi) * soilCellResolution
				cellY := float64(yi) * soilCellResolution
				db.Exec(`
					INSERT INTO soil_cells (garden_id, x_m, y_m, nitrogen, phosphorus, potassium, recorded_at)
					SELECT $1, $2, $3,
						LEAST(100, GREATEST(0, COALESCE(sc.nitrogen,50) + p.nitrogen_impact)),
						LEAST(100, GREATEST(0, COALESCE(sc.phosphorus,50) + p.phosphorus_impact)),
						LEAST(100, GREATEST(0, COALESCE(sc.potassium,50) + p.potassium_impact)),
						now()
					FROM plants p
					LEFT JOIN soil_cells sc ON sc.garden_id=$1 AND sc.x_m=$2 AND sc.y_m=$3
					WHERE p.id=$4
					ON CONFLICT (garden_id, x_m, y_m) DO UPDATE
					SET nitrogen=EXCLUDED.nitrogen, phosphorus=EXCLUDED.phosphorus, potassium=EXCLUDED.potassium, recorded_at=now()`,
					id, cellX, cellY, req.PlantID,
				)
			}
		}

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
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`, id,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

// MovePlantInGarden moves an existing placement to a new position.
func MovePlantInGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		gardenID := chi.URLParam(r, "id")
		placementID := chi.URLParam(r, "placementId")

		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, gardenID).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		var req struct {
			X       float64 `json:"x"`
			Y       float64 `json:"y"`
			WidthM  float64 `json:"widthM"`
			HeightM float64 `json:"heightM"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.WidthM <= 0 {
			req.WidthM = 0.5
		}
		if req.HeightM <= 0 {
			req.HeightM = 0.5
		}

		_, err = db.Exec(
			`UPDATE plant_placements SET x_m=$1, y_m=$2, width_m=$3, height_m=$4 WHERE id=$5 AND garden_id=$6`,
			req.X, req.Y, req.WidthM, req.HeightM, placementID, gardenID,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "move failed")
			return
		}

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`, gardenID,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

// RemovePlantFromGarden removes a plant placement by its ID.
// If the plant was placed today the nutrient impact is reverted on the affected soil cells.
func RemovePlantFromGarden(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		gardenID := chi.URLParam(r, "id")
		placementID := chi.URLParam(r, "placementId")

		var ownerID int
		err := db.QueryRow(`SELECT user_id FROM gardens WHERE id=$1`, gardenID).Scan(&ownerID)
		if err != nil || ownerID != uid {
			respondError(w, http.StatusForbidden, "forbidden")
			return
		}

		// Fetch placement before deleting so we can revert soil if needed
		var plantID, plantedDate string
		var px, py, pWidthM, pHeightM float64
		placementFound := db.QueryRow(
			`SELECT plant_id, x_m, y_m, width_m, height_m, planted_date::text
			 FROM plant_placements WHERE id=$1 AND garden_id=$2`,
			placementID, gardenID,
		).Scan(&plantID, &px, &py, &pWidthM, &pHeightM, &plantedDate) == nil

		db.Exec(`DELETE FROM plant_placements WHERE id=$1 AND garden_id=$2`, placementID, gardenID)

		// Revert soil nutrient impact if the plant was placed today
		if placementFound && strings.HasPrefix(plantedDate, time.Now().Format("2006-01-02")) {
			xCells := int(px / soilCellResolution)
			yCells := int(py / soilCellResolution)
			xEnd := int((px + pWidthM + soilCellResolution - 0.001) / soilCellResolution)
			yEnd := int((py + pHeightM + soilCellResolution - 0.001) / soilCellResolution)
			for xi := xCells; xi < xEnd; xi++ {
				for yi := yCells; yi < yEnd; yi++ {
					cellX := float64(xi) * soilCellResolution
					cellY := float64(yi) * soilCellResolution
					db.Exec(`
						UPDATE soil_cells
						SET nitrogen    = LEAST(100, GREATEST(0, nitrogen    - p.nitrogen_impact)),
						    phosphorus  = LEAST(100, GREATEST(0, phosphorus  - p.phosphorus_impact)),
						    potassium   = LEAST(100, GREATEST(0, potassium   - p.potassium_impact)),
						    recorded_at = now()
						FROM plants p
						WHERE soil_cells.garden_id=$1
						  AND soil_cells.x_m=$2
						  AND soil_cells.y_m=$3
						  AND p.id=$4`,
						gardenID, cellX, cellY, plantID,
					)
				}
			}
		}

		var g gardenRow
		db.QueryRow(
			`SELECT id::text, user_id, name, width_m, height_m, created_at::text FROM gardens WHERE id=$1`, gardenID,
		).Scan(&g.ID, &g.UserID, &g.Name, &g.WidthM, &g.HeightM, &g.CreatedAt)
		gr, _ := hydrateGarden(db, g)
		respondJSON(w, http.StatusOK, gr)
	}
}

