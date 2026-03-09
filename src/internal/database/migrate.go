package database

import "database/sql"

// AutoMigrate runs all schema migrations in order.
// All statements are idempotent (IF NOT EXISTS).
func AutoMigrate(db *sql.DB) error {
	migrations := []string{
		// Users
		`CREATE TABLE IF NOT EXISTS users (
			id            SERIAL PRIMARY KEY,
			name          TEXT NOT NULL,
			email         TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL DEFAULT '',
			role          TEXT NOT NULL DEFAULT 'user',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Gardens (meter-based dimensions)
		`CREATE TABLE IF NOT EXISTS gardens (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name       TEXT NOT NULL,
			width_m    NUMERIC(6,2) NOT NULL DEFAULT 5.0,
			height_m   NUMERIC(6,2) NOT NULL DEFAULT 5.0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Soil cells (x_m/y_m are 0.5m-resolution coords)
		`CREATE TABLE IF NOT EXISTS soil_cells (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			garden_id   UUID NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
			x_m         NUMERIC(6,3) NOT NULL,
			y_m         NUMERIC(6,3) NOT NULL,
			moisture    NUMERIC(5,2) NOT NULL DEFAULT 50,
			nitrogen    NUMERIC(5,2) NOT NULL DEFAULT 50,
			phosphorus  NUMERIC(5,2) NOT NULL DEFAULT 50,
			potassium   NUMERIC(5,2) NOT NULL DEFAULT 50,
			ph          NUMERIC(4,2) NOT NULL DEFAULT 7.0,
			recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE(garden_id, x_m, y_m)
		)`,
		// Soil history (full garden snapshot)
		`CREATE TABLE IF NOT EXISTS soil_history (
			id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
			garden_id   UUID  NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
			snapshot    JSONB NOT NULL,
			recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Plants (with size)
		`CREATE TABLE IF NOT EXISTS plants (
			id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			creator_id        INT  REFERENCES users(id) ON DELETE SET NULL,
			name              TEXT NOT NULL,
			description       TEXT NOT NULL DEFAULT '',
			image_url         TEXT,
			nitrogen_impact   NUMERIC(4,1) NOT NULL DEFAULT 0,
			phosphorus_impact NUMERIC(4,1) NOT NULL DEFAULT 0,
			potassium_impact  NUMERIC(4,1) NOT NULL DEFAULT 0,
			ph_impact         NUMERIC(4,2) NOT NULL DEFAULT 0,
			germination_days  INT  NOT NULL DEFAULT 7,
			maturity_days     INT  NOT NULL DEFAULT 60,
			harvest_days      INT  NOT NULL DEFAULT 90,
			width_m           NUMERIC(4,2) NOT NULL DEFAULT 0.5,
			height_m          NUMERIC(4,2) NOT NULL DEFAULT 0.5,
			is_public         BOOLEAN NOT NULL DEFAULT true,
			created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Companion/harmful relationships
		`CREATE TABLE IF NOT EXISTS plant_relationships (
			id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plant_a_id          UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
			plant_b_id          UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
			relationship_type   TEXT NOT NULL CHECK (relationship_type IN ('beneficial','neutral','harmful')),
			benefit_description TEXT NOT NULL DEFAULT '',
			UNIQUE(plant_a_id, plant_b_id)
		)`,
		// Plant placements (free-form metre positions)
		`CREATE TABLE IF NOT EXISTS plant_placements (
			id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			garden_id    UUID NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
			plant_id     UUID NOT NULL REFERENCES plants(id),
			x_m          NUMERIC(6,3) NOT NULL DEFAULT 0,
			y_m          NUMERIC(6,3) NOT NULL DEFAULT 0,
			width_m      NUMERIC(4,2) NOT NULL DEFAULT 0.5,
			height_m     NUMERIC(4,2) NOT NULL DEFAULT 0.5,
			planted_date DATE NOT NULL DEFAULT CURRENT_DATE
		)`,
		// Notifications
		`CREATE TABLE IF NOT EXISTS notifications (
			id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			garden_id    UUID REFERENCES gardens(id) ON DELETE SET NULL,
			plant_id     UUID REFERENCES plants(id)  ON DELETE SET NULL,
			type         TEXT NOT NULL CHECK (type IN ('watering','harvest','maintenance','system')),
			title        TEXT NOT NULL,
			body         TEXT NOT NULL DEFAULT '',
			scheduled_at TIMESTAMPTZ,
			sent_at      TIMESTAMPTZ,
			read_at      TIMESTAMPTZ,
			created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Activity log
		`CREATE TABLE IF NOT EXISTS activity_logs (
			id            SERIAL PRIMARY KEY,
			user_id       INT  REFERENCES users(id) ON DELETE SET NULL,
			activity_type TEXT NOT NULL,
			details       TEXT NOT NULL DEFAULT '',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_gardens_user_id    ON gardens(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_soil_cells_garden  ON soil_cells(garden_id, x_m, y_m)`,
		`CREATE INDEX IF NOT EXISTS idx_soil_history_garden ON soil_history(garden_id, recorded_at)`,
		`CREATE INDEX IF NOT EXISTS idx_placements_garden  ON plant_placements(garden_id)`,
		`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_user      ON activity_logs(user_id, created_at)`,
	}
	for _, q := range migrations {
		if _, err := db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

