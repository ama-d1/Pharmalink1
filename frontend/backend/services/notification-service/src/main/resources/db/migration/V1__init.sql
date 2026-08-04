-- Baseline schema for notification-service (pharmalink_notifications),
-- hand-derived from model/Notification.java's JPA annotations. No live
-- Postgres/matching Java version was available in this sandbox to pg_dump a
-- real schema from — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE notifications (
    id                  VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255) NOT NULL,
    type                VARCHAR(255) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    body                TEXT NOT NULL,
    related_entity_id   VARCHAR(255),
    read                BOOLEAN NOT NULL,
    created_at          TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_notification_user ON notifications (user_id);
CREATE INDEX idx_notification_user_created_at ON notifications (user_id, created_at);
