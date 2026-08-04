-- Baseline schema for user-profile-service (pharmalink_profile), hand-derived
-- from model/Profile.java and model/Appointment.java's JPA annotations. No
-- live Postgres/matching Java version was available in this sandbox to
-- pg_dump a real schema from — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE profiles (
    user_id                 VARCHAR(255) NOT NULL,
    full_name               VARCHAR(255) NOT NULL,
    phone_number            VARCHAR(255) NOT NULL,
    role                    VARCHAR(255) NOT NULL,
    email                   VARCHAR(255) NOT NULL,
    profile_picture_url     VARCHAR(255),
    blood_group             VARCHAR(255),
    allergies               VARCHAR(255),
    conditions              VARCHAR(255),
    adherence_rate          DOUBLE PRECISION,
    day_streak              INTEGER,
    notifications_enabled   BOOLEAN NOT NULL,
    privacy_mode            BOOLEAN NOT NULL,
    pharmacy_id             VARCHAR(255),
    pharmacy_name           VARCHAR(255),
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP,
    PRIMARY KEY (user_id)
);

CREATE TABLE appointments (
    id                  VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255) NOT NULL,
    professional_name   VARCHAR(255),
    specialty           VARCHAR(255),
    appointment_date    DATE,
    appointment_time    TIME,
    status              VARCHAR(255),
    PRIMARY KEY (id)
);
