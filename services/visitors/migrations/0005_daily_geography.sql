-- Store only daily aggregates; empty country/city labels represent unknown values.
-- The start date is the migration date in the site's UTC+8 reporting timezone.
CREATE TABLE visitor_daily_geography (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  visits INTEGER NOT NULL CHECK (visits > 0),
  PRIMARY KEY (day, country, city)
);

CREATE TABLE visitor_daily_geography_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at TEXT NOT NULL CHECK (started_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

INSERT INTO visitor_daily_geography_meta (id, started_at)
VALUES (1, strftime('%Y-%m-%d', 'now', '+8 hours'));
