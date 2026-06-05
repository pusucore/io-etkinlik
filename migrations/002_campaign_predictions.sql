-- Campaign & user predictions schema

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_checked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS campaign_settings (
  id SERIAL PRIMARY KEY,
  start_message_title TEXT,
  start_message_body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  uploaded_image_path TEXT,
  button_text TEXT,
  button_url TEXT,
  mini_app_button_text TEXT DEFAULT 'Bracket Tahminine Katıl',
  mini_app_url TEXT,
  channel_url TEXT,
  terms_text TEXT,
  prediction_deadline TIMESTAMP,
  tournament_start_date TIMESTAMP,
  min_deposit_amount NUMERIC(12,2) DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  locked BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP,
  champion_team_id INT REFERENCES teams(id),
  third_place_team_id INT REFERENCES teams(id),
  total_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_group_rankings (
  id SERIAL PRIMARY KEY,
  prediction_id INT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  group_code CHAR(1) NOT NULL,
  position INT NOT NULL CHECK (position BETWEEN 1 AND 4),
  team_id INT NOT NULL REFERENCES teams(id),
  UNIQUE (prediction_id, group_code, position),
  UNIQUE (prediction_id, group_code, team_id)
);

CREATE TABLE IF NOT EXISTS prediction_best_thirds (
  id SERIAL PRIMARY KEY,
  prediction_id INT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  group_code CHAR(1) NOT NULL,
  team_id INT NOT NULL REFERENCES teams(id),
  UNIQUE (prediction_id, group_code)
);

CREATE TABLE IF NOT EXISTS prediction_third_slots (
  prediction_id INT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  match_no INT NOT NULL,
  team_id INT NOT NULL REFERENCES teams(id),
  PRIMARY KEY (prediction_id, match_no)
);

CREATE TABLE IF NOT EXISTS prediction_matches (
  id SERIAL PRIMARY KEY,
  prediction_id INT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  match_no INT NOT NULL,
  stage TEXT NOT NULL,
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  winner_team_id INT REFERENCES teams(id),
  loser_team_id INT REFERENCES teams(id),
  UNIQUE (prediction_id, match_no)
);

CREATE TABLE IF NOT EXISTS real_results (
  id SERIAL PRIMARY KEY,
  result_type TEXT NOT NULL,
  group_code CHAR(1),
  match_no INT,
  team_id INT REFERENCES teams(id),
  position INT,
  winner_team_id INT REFERENCES teams(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS deposit_imports (
  id SERIAL PRIMARY KEY,
  filename TEXT,
  imported_by TEXT,
  imported_at TIMESTAMP DEFAULT NOW(),
  rows_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS deposit_records (
  id SERIAL PRIMARY KEY,
  import_id INT REFERENCES deposit_imports(id) ON DELETE SET NULL,
  slotio_username TEXT,
  slotio_username_normalized TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'TRY',
  deposit_date DATE,
  matched_user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_rankings ON prediction_group_rankings(prediction_id);
CREATE INDEX IF NOT EXISTS idx_deposit_norm ON deposit_records(slotio_username_normalized);
CREATE INDEX IF NOT EXISTS idx_real_results_type ON real_results(result_type);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_id TEXT;
