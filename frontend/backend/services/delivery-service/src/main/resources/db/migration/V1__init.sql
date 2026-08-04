-- Baseline schema for delivery-service (pharmalink_delivery), hand-derived
-- from model/Delivery.java's JPA annotations. No live Postgres/matching Java
-- version was available in this sandbox to pg_dump a real schema from — see
-- MICROSERVICES_PLAN.md Phase 2 step 9. Note: the entity declares
-- trackingNumber's uniqueness twice (@Column(unique=true) AND a unique
-- @Index) — collapsed to a single unique index here since both express the
-- same constraint.
CREATE TABLE deliveries (
    id                  VARCHAR(255) NOT NULL,
    order_id            VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255) NOT NULL,
    delivery_speed      VARCHAR(255) NOT NULL,
    address             VARCHAR(255) NOT NULL,
    phone_number        VARCHAR(255) NOT NULL,
    instructions        TEXT,
    estimated_fee       DOUBLE PRECISION NOT NULL,
    status              VARCHAR(255) NOT NULL,
    driver_name         VARCHAR(255),
    driver_phone        VARCHAR(255),
    estimated_arrival   TIMESTAMP,
    tracking_number     VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_delivery_user ON deliveries (user_id);
CREATE UNIQUE INDEX idx_delivery_tracking_number ON deliveries (tracking_number);
CREATE INDEX idx_delivery_order ON deliveries (order_id);
