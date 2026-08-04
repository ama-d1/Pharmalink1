-- Added 2026-07-24 — patient<->driver chat, reusing the same conversations
-- table used for patient<->pharmacist chat (Message is already fully
-- generic; only Conversation was hardcoded to two participant columns).
-- pharmacist_id must become nullable here too: a driver-conversation row
-- has a driverId but no pharmacistId.
ALTER TABLE conversations ADD COLUMN driver_id VARCHAR(255);
ALTER TABLE conversations ALTER COLUMN pharmacist_id DROP NOT NULL;
CREATE INDEX idx_conv_driver ON conversations (driver_id);
