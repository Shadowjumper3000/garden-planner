package repository

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	"garden-planner/internal/database"
)

type pgPlantRepo struct{ db *sql.DB }

const plantCols = `id, creator_id, name, description, image_url,
  nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact,
  germination_days, maturity_days, harvest_days, is_public, created_at`

func scanPlant(row interface{ Scan(...any) error }) (*database.Plant, error) {
	p := &database.Plant{}
	return p, row.Scan(
		&p.ID, &p.CreatorID, &p.Name, &p.Description, &p.ImageURL,
		&p.NitrogenImpact, &p.PhosphorusImpact, &p.PotassiumImpact, &p.PHImpact,
		&p.GerminationDays, &p.MaturityDays, &p.HarvestDays, &p.IsPublic, &p.CreatedAt,
	)
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
	rows, err := r.db.Query(
		fmt.Sprintf(`SELECT %s FROM plants WHERE created_at > now()-$1::interval ORDER BY created_at DESC LIMIT $2`, plantCols),
		fmt.Sprintf("%d days", days), limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlants(rows)
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
		fmt.Sprintf(`INSERT INTO plants
		 (id,creator_id,name,description,image_url,nitrogen_impact,phosphorus_impact,potassium_impact,ph_impact,germination_days,maturity_days,harvest_days,is_public,created_at)
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
		fmt.Sprintf(`UPDATE plants
		 SET name=$1,description=$2,image_url=$3,nitrogen_impact=$4,phosphorus_impact=$5,
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
