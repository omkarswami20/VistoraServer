const pool = require('../config/db');

const sql = `
-- 1. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  host_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  location VARCHAR(150) NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  max_guests INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);

-- 2. PROPERTY IMAGES TABLE
CREATE TABLE IF NOT EXISTS property_images (
  id SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AMENITIES TABLE (Master List)
CREATE TABLE IF NOT EXISTS amenities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- 4. PROPERTY_AMENITIES (Many-to-Many Junction Table)
CREATE TABLE IF NOT EXISTS property_amenities (
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- 5. AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_property_date UNIQUE (property_id, date)
);

CREATE INDEX IF NOT EXISTS idx_availability_property_date ON availability(property_id, date);

-- 6. DEFAULT AMENITIES SEED (Starter List)
INSERT INTO amenities (name) VALUES 
  ('WiFi'),
  ('Air Conditioning'),
  ('Swimming Pool'),
  ('Free Parking'),
  ('Kitchen'),
  ('TV'),
  ('Dedicated Workspace'),
  ('Washing Machine')
ON CONFLICT (name) DO NOTHING;
`;

async function runMigration() {
  try {
    console.log('⏳ Running property tables migration...');
    await pool.query(sql);
    console.log('✅ Property tables and starter amenities created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
