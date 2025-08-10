CREATE TABLE IF NOT EXISTS appointment_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT   NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS weekly_program_slots (
  id                  SERIAL PRIMARY KEY,
  day_of_week         INT    NOT NULL,       -- 0=Sunday … 6=Saturday
  start_time          TIME   NOT NULL,
  end_time            TIME   NOT NULL,
  appointment_type_id INT    NOT NULL REFERENCES appointment_types(id),
  capacity            INT    NOT NULL,

  UNIQUE (day_of_week, start_time)
);

CREATE TABLE IF NOT EXISTS overrides (
  id               SERIAL PRIMARY KEY,
  date             DATE   NOT NULL,
  slot_id          INT    REFERENCES weekly_program_slots(id),
  override_type    TEXT   NOT NULL,          -- 'closed' or 'custom_slot'
  custom_start_time TIME,
  custom_end_time   TIME,
  notes            TEXT,
  appointment_type_id INT       REFERENCES appointment_types(id)
);

ALTER TABLE public.overrides
ADD CONSTRAINT overrides_custom_slot_requires_type
CHECK (
  LOWER(TRIM(override_type)) <> 'custom_slot'
  OR appointment_type_id IS NOT NULL
);

ALTER TABLE overrides
  ADD COLUMN capacity INT;

UPDATE overrides
SET capacity = 6
WHERE override_type = 'custom_slot'
  AND capacity IS NULL;

ALTER TABLE overrides
  ADD CONSTRAINT overrides_capacity_custom_slot_chk
  CHECK (
    override_type <> 'custom_slot'
    OR (capacity IS NOT NULL AND capacity > 0)
  );

CREATE TABLE IF NOT EXISTS appointments (
  id                  SERIAL    PRIMARY KEY,
  user_id             UUID      REFERENCES auth.users(id),
  slot_id             INT       REFERENCES weekly_program_slots(id),
  date                DATE      NOT NULL,
  start_time          TIME      NOT NULL,
  end_time            TIME      NOT NULL,
  appointment_type_id INT       REFERENCES appointment_types(id),
  status              TEXT      NOT NULL,  -- 'booked','cancelled','completed'
  created_at          TIMESTAMP DEFAULT NOW(),
  notes               TEXT
);

-- 2) Insert appointment types (idempotent)
INSERT INTO appointment_types (name, description)
VALUES
  ('Group', 'Standard group training session'),
  ('TRX',   'TRX suspension training')
ON CONFLICT (name) DO NOTHING;

-- 3) Populate weekly_program_slots
WITH types AS (
  SELECT
    (SELECT id FROM appointment_types WHERE name = 'Group') AS group_id,
    (SELECT id FROM appointment_types WHERE name = 'TRX')   AS trx_id
)
INSERT INTO weekly_program_slots 
  (day_of_week, start_time, end_time, appointment_type_id, capacity)
SELECT
  dow,
  ts::time                                 AS start_time,
  (ts + INTERVAL '1 hour')::time           AS end_time,
  CASE WHEN dow BETWEEN 1 AND 5 THEN group_id ELSE trx_id END,
  CASE WHEN dow BETWEEN 1 AND 5 THEN 6        ELSE 4      END
FROM types
CROSS JOIN LATERAL
  -- days 1 (Mon)–6 (Sat)
  generate_series(1,6) AS dow
CROSS JOIN LATERAL
  -- generate hourly timestamps on arbitrary date
  generate_series(
    CASE WHEN dow BETWEEN 1 AND 5 
         THEN timestamp '2000-01-01 09:00'
         ELSE timestamp '2000-01-01 09:00'
    END,
    CASE WHEN dow BETWEEN 1 AND 5 
         THEN timestamp '2000-01-01 20:00'  -- last slot 20→21
         ELSE timestamp '2000-01-01 14:00'  -- last slot 14→15
    END,
    INTERVAL '1 hour'
  ) AS ts
ON CONFLICT (day_of_week, start_time) DO NOTHING;