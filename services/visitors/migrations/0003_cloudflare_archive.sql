-- Cloudflare aggregates are a separate source; never merge legacy visit counters.
CREATE TABLE cf_days (
  day TEXT PRIMARY KEY,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  visits REAL NOT NULL CHECK (visits >= 0),
  synced_at TEXT NOT NULL
);
CREATE TABLE cf_dimensions (
  day TEXT NOT NULL REFERENCES cf_days(day) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('country', 'referrer', 'os', 'device')),
  value TEXT NOT NULL,
  visits REAL NOT NULL CHECK (visits >= 0),
  PRIMARY KEY (day, dimension, value)
);
CREATE TABLE cf_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  source TEXT,
  history_start TEXT,
  next_day TEXT,
  bootstrap_complete INTEGER NOT NULL DEFAULT 0,
  last_success TEXT,
  last_error TEXT,
  lock_owner TEXT,
  lock_until TEXT
);
INSERT INTO cf_sync_state (id) VALUES (1);
