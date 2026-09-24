-- Daily counts supplement the existing lifetime totals; do not backdate old visits.
CREATE TABLE visitor_daily (
  day TEXT PRIMARY KEY CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  visits INTEGER NOT NULL CHECK (visits > 0)
);

CREATE TABLE visitor_counter_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_started_at TEXT NOT NULL
);

INSERT INTO visitor_counter_meta (id, daily_started_at)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
