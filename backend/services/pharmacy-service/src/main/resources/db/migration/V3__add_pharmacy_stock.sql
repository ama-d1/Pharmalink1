-- Added 2026-07-23 for the multi-pharmacy price-comparison "Order Meds"
-- rebuild. One row per (pharmacy, drug) pair, enforced by the unique
-- constraint — a pharmacist updates their existing row's price/quantity
-- rather than creating duplicates. See PharmacyStock's class javadoc.
CREATE TABLE pharmacy_stock (
    id           VARCHAR(255) NOT NULL,
    pharmacy_id  VARCHAR(255) NOT NULL,
    drug_id      VARCHAR(255) NOT NULL,
    drug_name    VARCHAR(255) NOT NULL,
    price        DOUBLE PRECISION NOT NULL,
    quantity     INTEGER NOT NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_stock_pharmacy ON pharmacy_stock (pharmacy_id);
CREATE INDEX idx_stock_drug_name ON pharmacy_stock (drug_name);
ALTER TABLE pharmacy_stock ADD CONSTRAINT uq_stock_pharmacy_drug UNIQUE (pharmacy_id, drug_id);
ALTER TABLE pharmacy_stock ADD CONSTRAINT fk_stock_pharmacy
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies (id);
