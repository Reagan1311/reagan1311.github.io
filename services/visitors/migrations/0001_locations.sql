CREATE TABLE locations (
  location_key TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  lat REAL,
  lon REAL,
  visits INTEGER NOT NULL DEFAULT 1 CHECK (visits > 0),
  CHECK ((lat IS NULL AND lon IS NULL) OR
    (lat IS NOT NULL AND lon IS NOT NULL AND lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180))
);
