-- Added 2026-07-23 — stock item photos, stored as a base64 data URI (no
-- cloud image storage set up yet, see PharmacyStock.imageBase64 javadoc).
-- TEXT, not VARCHAR(255) — an encoded photo is far bigger than that limit.
ALTER TABLE pharmacy_stock ADD COLUMN image_base64 TEXT;
