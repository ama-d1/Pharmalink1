-- Baseline schema for home-service (pharmalink_home), hand-derived from
-- model/HealthTip.java's JPA annotations. No live Postgres/matching Java
-- version was available in this sandbox to pg_dump a real schema from — see
-- MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE health_tips (
    id         VARCHAR(255) NOT NULL,
    content    TEXT NOT NULL,
    category   VARCHAR(255),
    PRIMARY KEY (id)
);
