-- Baseline schema for drug-catalog-service (pharmalink_drugs), hand-derived
-- from model/DrugCatalog.java's JPA annotations. No live Postgres/matching
-- Java version was available in this sandbox to pg_dump a real schema from
-- — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE drug_catalog (
    id           VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  VARCHAR(255),
    price        DOUBLE PRECISION NOT NULL,
    in_stock     BOOLEAN NOT NULL,
    PRIMARY KEY (id)
);
