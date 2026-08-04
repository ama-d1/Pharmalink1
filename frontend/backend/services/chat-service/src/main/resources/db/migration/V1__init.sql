-- Baseline schema for chat-service (pharmalink_chat), hand-derived from
-- model/Conversation.java and model/Message.java's JPA annotations. No live
-- Postgres/matching Java version was available in this sandbox to pg_dump a
-- real schema from — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE conversations (
    id                     VARCHAR(255) NOT NULL,
    patient_id             VARCHAR(255) NOT NULL,
    pharmacist_id          VARCHAR(255) NOT NULL,
    created_at             TIMESTAMP,
    last_message_at        TIMESTAMP,
    last_message_preview   VARCHAR(120),
    PRIMARY KEY (id)
);
CREATE INDEX idx_conv_patient ON conversations (patient_id);
CREATE INDEX idx_conv_pharmacist ON conversations (pharmacist_id);

CREATE TABLE messages (
    id                VARCHAR(255) NOT NULL,
    conversation_id   VARCHAR(255) NOT NULL,
    sender_id         VARCHAR(255) NOT NULL,
    content           TEXT NOT NULL,
    message_type      VARCHAR(255),
    media_url         VARCHAR(255),
    sent_at           TIMESTAMP,
    read_status       BOOLEAN NOT NULL,
    PRIMARY KEY (id)
);
CREATE INDEX idx_message_conversation ON messages (conversation_id);
CREATE INDEX idx_message_sender ON messages (sender_id);
