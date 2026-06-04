CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  slotio_username TEXT UNIQUE NOT NULL,
  slotio_username_normalized TEXT UNIQUE NOT NULL,
  is_channel_member BOOLEAN DEFAULT FALSE,
  bonus_eligible BOOLEAN DEFAULT FALSE,
  disqualified BOOLEAN DEFAULT FALSE,
  disqualification_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  group_code CHAR(1) NOT NULL,
  default_position INT NOT NULL,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  UNIQUE (group_code, default_position)
);

CREATE TABLE IF NOT EXISTS group_results (
  id SERIAL PRIMARY KEY,
  group_code CHAR(1) UNIQUE NOT NULL,
  position_1_team_id INT REFERENCES teams(id),
  position_2_team_id INT REFERENCES teams(id),
  position_3_team_id INT REFERENCES teams(id),
  position_4_team_id INT REFERENCES teams(id),
  locked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS best_thirds (
  id SERIAL PRIMARY KEY,
  group_code CHAR(1) UNIQUE NOT NULL,
  team_id INT REFERENCES teams(id),
  selected BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bracket_third_slots (
  match_no INT PRIMARY KEY,
  team_id INT REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS bracket_matches (
  id SERIAL PRIMARY KEY,
  match_no INT UNIQUE NOT NULL,
  stage TEXT NOT NULL,
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  home_source TEXT,
  away_source TEXT,
  winner_team_id INT REFERENCES teams(id),
  loser_team_id INT REFERENCES teams(id),
  locked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_slotio_norm ON users(slotio_username_normalized);
CREATE INDEX IF NOT EXISTS idx_bracket_stage ON bracket_matches(stage);
