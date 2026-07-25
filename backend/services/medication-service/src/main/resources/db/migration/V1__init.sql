-- Baseline schema for medication-service (pharmalink_medication), hand-derived
-- from model/Medication.java and model/DoseLog.java's JPA annotations. No
-- live Postgres/matching Java version was available in this sandbox to
-- pg_dump a real schema from — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE medications (
    id                    VARCHAR(255) NOT NULL,
    user_id               VARCHAR(255) NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    dosage                VARCHAR(255) NOT NULL,
    frequency             VARCHAR(255) NOT NULL,
    instructions          VARCHAR(255),
    reminder_time         TIME NOT NULL,
    start_date            DATE NOT NULL,
    end_date              DATE,
    status                VARCHAR(255) NOT NULL,
    dose_status           VARCHAR(255) NOT NULL,
    medication_group_id   VARCHAR(255) NOT NULL,
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_medication_user ON medications (user_id);
CREATE INDEX idx_medication_user_status ON medications (user_id, status);
CREATE INDEX idx_medication_group ON medications (medication_group_id);

CREATE TABLE dose_logs (
    id             VARCHAR(255) NOT NULL,
    user_id        VARCHAR(255) NOT NULL,
    medication_id  VARCHAR(255) NOT NULL,
    taken_at       TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_doselog_user ON dose_logs (user_id);
CREATE INDEX idx_doselog_medication ON dose_logs (medication_id);
