-- Baseline schema for pharmacy-service (pharmalink_pharmacy), hand-derived
-- from model/Pharmacy.java's JPA annotations, including its @ElementCollection
-- (services list) join table. No live Postgres/matching Java version was
-- available in this sandbox to pg_dump a real schema from — see
-- MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE pharmacies (
    id            VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    address       VARCHAR(255) NOT NULL,
    city          VARCHAR(255),
    region        VARCHAR(255),
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    phone         VARCHAR(255),
    email         VARCHAR(255),
    website       VARCHAR(255),
    open_hours    VARCHAR(255),
    rating        DOUBLE PRECISION NOT NULL,
    review_count  INTEGER NOT NULL,
    description   VARCHAR(1000),
    verified      BOOLEAN NOT NULL,
    open          BOOLEAN NOT NULL,
    created_at    TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_pharmacy_city ON pharmacies (city);
CREATE INDEX idx_pharmacy_region ON pharmacies (region);
CREATE INDEX idx_pharmacy_open ON pharmacies (open);

-- @ElementCollection(List<String> services) — Hibernate's default join
-- table for a non-indexed List<String>: FK column + one value column, no
-- separate PK, no uniqueness (a bag, not a set).
CREATE TABLE pharmacy_services (
    pharmacy_id  VARCHAR(255) NOT NULL,
    service      VARCHAR(255)
);
ALTER TABLE pharmacy_services ADD CONSTRAINT fk_pharmacy_services_pharmacy
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies (id);
