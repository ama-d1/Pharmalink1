-- Coming-soon roadmap item #2 (COMING_SOON_ROADMAP.md): "Pharmacy reviews &
-- ratings". One review per user per pharmacy, enforced by the unique
-- constraint (uq_review_pharmacy_user) rather than just relying on
-- application logic — ReviewService.upsertReview() checks for an existing
-- row first, but the DB constraint is the real backstop against a race
-- (two near-simultaneous submissions from the same user).
CREATE TABLE reviews (
    id           VARCHAR(255) NOT NULL,
    pharmacy_id  VARCHAR(255) NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    rating       INTEGER NOT NULL,
    comment      VARCHAR(1000),
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_review_pharmacy ON reviews (pharmacy_id);
ALTER TABLE reviews ADD CONSTRAINT uq_review_pharmacy_user UNIQUE (pharmacy_id, user_id);
ALTER TABLE reviews ADD CONSTRAINT fk_review_pharmacy
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies (id);
