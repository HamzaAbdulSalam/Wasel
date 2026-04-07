CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hazards (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS updates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  hazard_id INT NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id SERIAL PRIMARY KEY,
  update_id INT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL,
  description TEXT,
  logged_by INT NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

INSERT INTO hazards (name, description) VALUES
  ('Flood', 'Water overflow in residential or commercial areas'),
  ('Landslide', 'Soil erosion or ground movement'),
  ('Storm', 'Severe weather conditions'),
  ('Fire', 'Uncontrolled fire outbreak'),
  ('Earthquake', 'Seismic activity'),
  ('Traffic', 'Road congestion or accidents')
ON CONFLICT DO NOTHING;
