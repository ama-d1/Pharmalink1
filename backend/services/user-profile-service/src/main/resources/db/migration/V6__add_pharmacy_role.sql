-- Added 2026-07-23 — a pharmacy can now have multiple staff accounts (an
-- OWNER plus any number of MANAGERs), all sharing the same pharmacy_id.
-- Nullable: pre-existing PHARMACIST profiles assigned before this column
-- existed simply have no tier recorded yet.
ALTER TABLE profiles ADD COLUMN pharmacy_role VARCHAR(255);
