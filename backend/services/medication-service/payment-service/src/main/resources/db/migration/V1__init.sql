-- Baseline schema for payment-service (pharmalink_payments), hand-derived
-- from model/Payment.java's JPA annotations, matching the same conventions
-- as every other service's V1 migration: VARCHAR(255) UUID-string primary
-- key (not a native UUID/BIGSERIAL column), snake_case columns, plain
-- TIMESTAMP (no timezone) for dates, stamped by @PrePersist/@PreUpdate in
-- Java rather than a DB default.
CREATE TABLE payments (
    id                  VARCHAR(255) NOT NULL,
    order_id            VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255) NOT NULL,
    amount_pesewas      BIGINT NOT NULL,
    currency            VARCHAR(255) NOT NULL,
    our_reference       VARCHAR(255) NOT NULL,
    authorization_url   VARCHAR(255),
    status              VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE INDEX idx_payment_order_id ON payments (order_id);
CREATE INDEX idx_payment_user_id ON payments (user_id);
CREATE UNIQUE INDEX idx_payment_reference ON payments (our_reference);
