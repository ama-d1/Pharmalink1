-- Added 2026-07-24 — roadmap: "Rate driver after delivery". One rating per
-- delivery (not per driver-lifetime), so a patient can rate a driver again
-- after a different completed delivery.
CREATE TABLE driver_ratings (
    id           VARCHAR(255) NOT NULL,
    delivery_id  VARCHAR(255) NOT NULL,
    driver_id    VARCHAR(255) NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    rating       INTEGER NOT NULL,
    comment      VARCHAR(1000),
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_driver_rating_delivery UNIQUE (delivery_id)
);
CREATE INDEX idx_driver_rating_driver ON driver_ratings (driver_id);
