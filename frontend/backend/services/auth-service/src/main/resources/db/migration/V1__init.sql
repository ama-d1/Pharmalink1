-- Baseline schema for auth-service (pharmalink_auth), hand-derived from
-- model/User.java's JPA annotations to match Hibernate's default DDL
-- conventions as closely as possible. No live Postgres/matching Java
-- version was available in this sandbox to pg_dump a real schema from —
-- see MICROSERVICES_PLAN.md Phase 2 step 9 for that caveat. Verify against
-- a real run before relying on this in a shared environment.
CREATE TABLE users (
    id                  VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password            VARCHAR(255) NOT NULL,
    role                VARCHAR(255) NOT NULL,
    enabled             BOOLEAN NOT NULL,
    reset_token         VARCHAR(255),
    reset_token_expiry  TIMESTAMP,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    PRIMARY KEY (id)
);

ALTER TABLE users ADD CONSTRAINT uk_users_reset_token UNIQUE (reset_token);
