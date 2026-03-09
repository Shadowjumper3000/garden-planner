package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"garden-planner/internal/middleware"
)

type plantOut struct {
	ID          string   `json:"id"`
	CreatorID   *int     `json:"creatorId"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	ImageURL    *string  `json:"imageUrl"`
	IsEditable  bool     `json:"isEditable"`
	Nutrients struct {
		NitrogenImpact   float64 `json:"nitrogenImpact"`
		PhosphorusImpact float64 `json:"phosphorusImpact"`
		PotassiumImpact  float64 `json:"potassiumImpact"`
	} `json:"nutrients"`
	CompatiblePlants  []string `json:"compatiblePlants"`
	CompanionBenefits string   `json:"companionBenefits"`
	GrowthCycle struct {
		Germination int `json:"germination"`
		Maturity    int `json:"maturity"`
		Harvest     int `json:"harvest"`
	} `json:"growthCycle"`
}

func scanPlant(rows *sql.Rows, currentUserID int) (plantOut, error) {
	var p plantOut
	var creatorID sql.NullInt64
	var imageURL sql.NullString
	if err := rows.Scan(
		&p.ID, &creatorID, &p.Name, &p.Description, &imageURL,
		&p.Nutrients.NitrogenImpact, &p.Nutrients.PhosphorusImpact, &p.Nutrients.PotassiumImpact,
		&p.GrowthCycle.Germination, &p.GrowthCycle.Maturity, &p.GrowthCycle.Harvest,
	); err != nil {
		return p, err
	}
	if creatorID.Valid {
		id := int(creatorID.Int64)
		p.CreatorID = &id
		p.IsEditable = id == currentUserID
	}
	if imageURL.Valid {
		p.ImageURL = &imageURL.String
	}
	p.CompatiblePlants = []string{}
	return p, nil
}

func enrichPlants(db *sql.DB, plants []plantOut) []plantOut {
	for i, p := range plants {
		rows, err := db.Query(`
			SELECT pr.plant_b_id::text, pr.benefit_description
			FROM plant_relationships pr
			WHERE pr.plant_a_id=$1 AND pr.relationship_type='beneficial'`, p.ID)
		if err != nil {
			continue
		}
		defer rows.Close()
		benefits := ""
		for rows.Next() {
			var bid, desc string
			rows.Scan(&bid, &desc)
			p.CompatiblePlants = append(p.CompatiblePlants, bid)
			if benefits == "" {
				benefits = desc
			}
		}
		p.CompanionBenefits = benefits
		plants[i] = p
	}
	return plants
}

const plantSelectCols = `id::text, creator_id, name, description, image_url,
	nitrogen_impact, phosphorus_impact, potassium_impact,
	germination_days, maturity_days, harvest_days`

// ListPlants returns all public plants.
func ListPlants(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, _ := middleware.GetUserID(r)
		rows, err := db.Query(`SELECT ` + plantSelectCols + ` FROM plants WHERE is_public=true ORDER BY name`)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()
		var plants []plantOut
		for rows.Next() {
			p, err := scanPlant(rows, uid)
			if err == nil {
				plants = append(plants, p)
			}
		}
		if plants == nil {
			plants = []plantOut{}
		}
		respondJSON(w, http.StatusOK, enrichPlants(db, plants))
	}
}

// ListMyPlants returns plants created by the current user.
func ListMyPlants(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		rows, err := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE creator_id=$1 ORDER BY created_at DESC`, uid)
		if err != nil {
			respondJSON(w, http.StatusOK, []plantOut{})
			return
		}
		defer rows.Close()
		var plants []plantOut
		for rows.Next() {
			p, err := scanPlant(rows, uid)
			if err == nil {
				plants = append(plants, p)
			}
		}
		if plants == nil {
			plants = []plantOut{}
		}
		respondJSON(w, http.StatusOK, enrichPlants(db, plants))
	}
}

// ListRecentPlants returns the most recently created public plants.
func ListRecentPlants(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, _ := middleware.GetUserID(r)
		rows, err := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE is_public=true ORDER BY created_at DESC LIMIT 10`)
		if err != nil {
			respondJSON(w, http.StatusOK, []plantOut{})
			return
		}
		defer rows.Close()
		var plants []plantOut
		for rows.Next() {
			if p, err := scanPlant(rows, uid); err == nil {
				plants = append(plants, p)
			}
		}
		if plants == nil {
			plants = []plantOut{}
		}
		respondJSON(w, http.StatusOK, enrichPlants(db, plants))
	}
}

// ListSharedPlants returns plants created by other users.
func ListSharedPlants(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, _ := middleware.GetUserID(r)
		rows, err := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE is_public=true AND (creator_id IS NULL OR creator_id!=$1) ORDER BY name`, uid)
		if err != nil {
			respondJSON(w, http.StatusOK, []plantOut{})
			return
		}
		defer rows.Close()
		var plants []plantOut
		for rows.Next() {
			if p, err := scanPlant(rows, uid); err == nil {
				plants = append(plants, p)
			}
		}
		if plants == nil {
			plants = []plantOut{}
		}
		respondJSON(w, http.StatusOK, enrichPlants(db, plants))
	}
}

// GetPlant returns a single plant.
func GetPlant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, _ := middleware.GetUserID(r)
		id := chi.URLParam(r, "id")
		rows, err := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE id=$1`, id)
		if err != nil {
			respondError(w, http.StatusNotFound, "plant not found")
			return
		}
		defer rows.Close()
		if !rows.Next() {
			respondError(w, http.StatusNotFound, "plant not found")
			return
		}
		p, err := scanPlant(rows, uid)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		ps := enrichPlants(db, []plantOut{p})
		respondJSON(w, http.StatusOK, ps[0])
	}
}

type createPlantReq struct {
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	ImageURL         string   `json:"imageUrl"`
	NitrogenImpact   float64  `json:"nitrogenImpact"`
	PhosphorusImpact float64  `json:"phosphorusImpact"`
	PotassiumImpact  float64  `json:"potassiumImpact"`
	PHImpact         float64  `json:"phImpact"`
	GerminationDays  int      `json:"germinationDays"`
	MaturityDays     int      `json:"maturityDays"`
	HarvestDays      int      `json:"harvestDays"`
	CompatiblePlants []string `json:"compatiblePlants"`
	CompanionBenefits string  `json:"companionBenefits"`
}

// CreatePlant creates a new plant in the library.
func CreatePlant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req createPlantReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}

		var pid string
		var imgURL *string
		if req.ImageURL != "" {
			imgURL = &req.ImageURL
		}

		err := db.QueryRow(`
			INSERT INTO plants (creator_id, name, description, image_url, nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact, germination_days, maturity_days, harvest_days, is_public)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING id::text`,
			uid, req.Name, req.Description, imgURL,
			req.NitrogenImpact, req.PhosphorusImpact, req.PotassiumImpact, req.PHImpact,
			req.GerminationDays, req.MaturityDays, req.HarvestDays,
		).Scan(&pid)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not create plant: "+err.Error())
			return
		}

		// Create companion relationships
		for _, cid := range req.CompatiblePlants {
			db.Exec(`
				INSERT INTO plant_relationships (plant_a_id, plant_b_id, relationship_type, benefit_description)
				VALUES ($1::uuid,$2::uuid,'beneficial',$3)
				ON CONFLICT (plant_a_id, plant_b_id) DO UPDATE SET benefit_description=$3`,
				pid, cid, req.CompanionBenefits,
			)
		}

		// Activity log
		db.Exec(`INSERT INTO activity_logs (user_id, activity_type, details) VALUES ($1,'plant_created',$2)`, uid, req.Name)

		rows, _ := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE id=$1`, pid)
		defer rows.Close()
		if rows.Next() {
			p, _ := scanPlant(rows, uid)
			ps := enrichPlants(db, []plantOut{p})
			respondJSON(w, http.StatusCreated, ps[0])
			return
		}
		respondJSON(w, http.StatusCreated, map[string]string{"id": pid})
	}
}

// UpdatePlant updates a plant (creator only).
func UpdatePlant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var creatorID sql.NullInt64
		db.QueryRow(`SELECT creator_id FROM plants WHERE id=$1`, id).Scan(&creatorID)
		if !creatorID.Valid || int(creatorID.Int64) != uid {
			respondError(w, http.StatusForbidden, "you can only edit plants you created")
			return
		}

		var req createPlantReq
		json.NewDecoder(r.Body).Decode(&req)

		var imgURL *string
		if req.ImageURL != "" {
			imgURL = &req.ImageURL
		}
		db.Exec(`
			UPDATE plants SET name=$1, description=$2, image_url=$3,
			nitrogen_impact=$4, phosphorus_impact=$5, potassium_impact=$6, ph_impact=$7,
			germination_days=$8, maturity_days=$9, harvest_days=$10
			WHERE id=$11`,
			req.Name, req.Description, imgURL,
			req.NitrogenImpact, req.PhosphorusImpact, req.PotassiumImpact, req.PHImpact,
			req.GerminationDays, req.MaturityDays, req.HarvestDays, id,
		)

		rows, _ := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE id=$1`, id)
		defer rows.Close()
		if rows.Next() {
			p, _ := scanPlant(rows, uid)
			ps := enrichPlants(db, []plantOut{p})
			respondJSON(w, http.StatusOK, ps[0])
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"id": id})
	}
}

// DeletePlant deletes a plant (creator only).
func DeletePlant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var creatorID sql.NullInt64
		db.QueryRow(`SELECT creator_id FROM plants WHERE id=$1`, id).Scan(&creatorID)
		if !creatorID.Valid || int(creatorID.Int64) != uid {
			respondError(w, http.StatusForbidden, "you can only delete plants you created")
			return
		}
		db.Exec(`DELETE FROM plants WHERE id=$1`, id)
		w.WriteHeader(http.StatusNoContent)
	}
}

// CopyPlant creates a new plant copied from an existing one, owned by the current user.
func CopyPlant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		id := chi.URLParam(r, "id")

		var pid string
		err := db.QueryRow(`
			INSERT INTO plants (creator_id, name, description, image_url, nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact, germination_days, maturity_days, harvest_days, is_public)
			SELECT $1, name || ' (copy)', description, image_url, nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact, germination_days, maturity_days, harvest_days, is_public
			FROM plants WHERE id=$2
			RETURNING id::text`, uid, id,
		).Scan(&pid)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not copy plant")
			return
		}

		rows, _ := db.Query(`SELECT `+plantSelectCols+` FROM plants WHERE id=$1`, pid)
		defer rows.Close()
		if rows.Next() {
			p, _ := scanPlant(rows, uid)
			ps := enrichPlants(db, []plantOut{p})
			respondJSON(w, http.StatusCreated, ps[0])
			return
		}
		respondJSON(w, http.StatusCreated, map[string]string{"id": pid})
	}
}

type relationshipOut struct {
	ID                 string `json:"id"`
	PlantAID           string `json:"plantAId"`
	PlantBID           string `json:"plantBId"`
	RelationshipType   string `json:"relationshipType"`
	BenefitDescription string `json:"benefitDescription"`
}

// GetPlantRelationships returns all relationships for a plant.
func GetPlantRelationships(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		rows, err := db.Query(`
			SELECT id::text, plant_a_id::text, plant_b_id::text, relationship_type, benefit_description
			FROM plant_relationships WHERE plant_a_id=$1 OR plant_b_id=$1`, id)
		if err != nil {
			respondJSON(w, http.StatusOK, []relationshipOut{})
			return
		}
		defer rows.Close()
		var result []relationshipOut
		for rows.Next() {
			var rel relationshipOut
			rows.Scan(&rel.ID, &rel.PlantAID, &rel.PlantBID, &rel.RelationshipType, &rel.BenefitDescription)
			result = append(result, rel)
		}
		if result == nil {
			result = []relationshipOut{}
		}
		respondJSON(w, http.StatusOK, result)
	}
}

// UpsertRelationship creates or updates a relationship between two plants.
func UpsertRelationship(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			PlantAID           string `json:"plantAId"`
			PlantBID           string `json:"plantBId"`
			RelationshipType   string `json:"relationshipType"`
			BenefitDescription string `json:"benefitDescription"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid body")
			return
		}
		var rid string
		db.QueryRow(`
			INSERT INTO plant_relationships (plant_a_id, plant_b_id, relationship_type, benefit_description)
			VALUES ($1::uuid,$2::uuid,$3,$4)
			ON CONFLICT (plant_a_id, plant_b_id) DO UPDATE
			SET relationship_type=$3, benefit_description=$4
			RETURNING id::text`,
			req.PlantAID, req.PlantBID, req.RelationshipType, req.BenefitDescription,
		).Scan(&rid)
		respondJSON(w, http.StatusOK, map[string]string{"id": rid})
	}
}
