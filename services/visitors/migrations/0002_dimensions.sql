CREATE TABLE visit_dimensions (
  dimension TEXT NOT NULL CHECK (dimension IN ('referrer', 'os', 'device')),
  value TEXT NOT NULL,
  visits INTEGER NOT NULL CHECK (visits > 0),
  PRIMARY KEY (dimension, value)
);

-- Older visits have no recorded dimensions; retain their totals honestly.
INSERT INTO visit_dimensions (dimension, value, visits)
SELECT dimension, 'unknown', total
FROM (SELECT 'referrer' AS dimension UNION ALL SELECT 'os' UNION ALL SELECT 'device')
CROSS JOIN (SELECT SUM(visits) AS total FROM locations)
WHERE total > 0;
