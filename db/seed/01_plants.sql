-- Seed: plant library
-- This file runs automatically when the Postgres container first initialises
-- (docker-entrypoint-initdb.d). Safe to re-run — uses INSERT … ON CONFLICT.

SET search_path TO public;

INSERT INTO plants (
  id, creator_id, name, description,
  nitrogen_impact, phosphorus_impact, potassium_impact, ph_impact,
  germination_days, maturity_days, harvest_days,
  width_m, height_m,
  is_public, created_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Tomato',
   'Classic garden tomato. Needs full sun and consistent watering.',
   -5, 2, 3, 0.0, 7, 60, 80, 0.5, 0.5, true, now()),

  ('00000000-0000-0000-0000-000000000002', NULL, 'Basil',
   'Aromatic herb that repels aphids and improves tomato flavour.',
   1, 0, 0, -0.2, 5, 30, 45, 0.25, 0.25, true, now()),

  ('00000000-0000-0000-0000-000000000003', NULL, 'Carrot',
   'Root vegetable. Loosens soil, benefiting nearby plants.',
   -1, 1, 2, 0.1, 10, 70, 90, 0.1, 0.5, true, now()),

  ('00000000-0000-0000-0000-000000000004', NULL, 'Marigold',
   'Natural pest deterrent. Deters nematodes and whitefly.',
   0, 1, 0, 0.0, 5, 45, 60, 0.25, 0.25, true, now()),

  ('00000000-0000-0000-0000-000000000005', NULL, 'Lettuce',
   'Fast-growing leafy green. Tolerates partial shade.',
   2, 1, 1, -0.1, 4, 30, 45, 0.3, 0.3, true, now()),

  ('00000000-0000-0000-0000-000000000006', NULL, 'Zucchini',
   'High-yield summer squash. Heavy feeder.',
   -8, -3, -2, 0.0, 7, 50, 60, 1.0, 1.0, true, now()),

  ('00000000-0000-0000-0000-000000000007', NULL, 'Beans (Bush)',
   'Nitrogen-fixing legume. Great companion for most vegetables.',
   10, 2, 1, 0.0, 8, 50, 65, 0.3, 0.5, true, now()),

  ('00000000-0000-0000-0000-000000000008', NULL, 'Cucumber',
   'Vining plant. Benefits from trellis support.',
   -3, 1, 2, 0.1, 6, 55, 70, 0.5, 1.0, true, now()),

  ('00000000-0000-0000-0000-000000000009', NULL, 'Pepper (Bell)',
   'Warm-season crop. Companion to basil and carrots.',
   -2, 2, 3, 0.0, 14, 70, 90, 0.5, 0.5, true, now()),

  ('00000000-0000-0000-0000-000000000010', NULL, 'Spinach',
   'Cool-season leafy green. Good nitrogen indicator.',
   3, 1, 1, -0.2, 5, 40, 55, 0.2, 0.2, true, now()),

  ('00000000-0000-0000-0000-000000000011', NULL, 'Garlic',
   'Natural fungicide and pest deterrent.',
   0, 1, 1, -0.3, 30, 180, 240, 0.1, 0.1, true, now()),

  ('00000000-0000-0000-0000-000000000012', NULL, 'Sunflower',
   'Attracts pollinators. Deep roots improve soil structure.',
   -2, 0, 1, 0.0, 7, 70, 90, 0.3, 1.5, true, now())

ON CONFLICT (id) DO NOTHING;

-- Plant companion relationships
INSERT INTO plant_relationships (id, plant_a_id, plant_b_id, relationship_type, benefit_description) VALUES
  ('10000001-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',   -- Tomato
   '00000000-0000-0000-0000-000000000002',   -- Basil
   'beneficial', 'Basil repels aphids and improves tomato growth and flavour'),

  ('10000001-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',   -- Tomato
   '00000000-0000-0000-0000-000000000004',   -- Marigold
   'beneficial', 'Marigolds deter nematodes that attack tomato roots'),

  ('10000001-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000007',   -- Beans
   '00000000-0000-0000-0000-000000000003',   -- Carrot
   'beneficial', 'Beans fix nitrogen that feeds carrots; carrots loosen soil for bean roots'),

  ('10000001-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000005',   -- Lettuce
   '00000000-0000-0000-0000-000000000003',   -- Carrot
   'beneficial', 'Lettuce provides ground cover that retains moisture for carrots'),

  ('10000001-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000008',   -- Cucumber
   '00000000-0000-0000-0000-000000000004',   -- Marigold
   'beneficial', 'Marigolds deter cucumber beetles'),

  ('10000001-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000009',   -- Pepper
   '00000000-0000-0000-0000-000000000002',   -- Basil
   'beneficial', 'Basil improves pepper flavour and deters spider mites'),

  ('10000001-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000011',   -- Garlic
   '00000000-0000-0000-0000-000000000001',   -- Tomato
   'beneficial', 'Garlic repels spider mites and improves tomato disease resistance')

ON CONFLICT (id) DO NOTHING;
