-- Added 2026-07-23 — real driver assignment + live location polling.
-- driverId/driverName/driverPhone already existed as columns (driverId is
-- new, the other two were always-null placeholders before this).
ALTER TABLE deliveries ADD COLUMN driver_id VARCHAR(255);
ALTER TABLE deliveries ADD COLUMN current_latitude DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN current_longitude DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN location_updated_at TIMESTAMP;
CREATE INDEX idx_delivery_driver ON deliveries (driver_id);
