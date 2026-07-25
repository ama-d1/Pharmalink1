-- Added 2026-07-23 for the multi-pharmacy price-comparison "Order Meds"
-- rebuild — an order previously had no pharmacy relationship at all.
-- Nullable: pre-existing orders (created before this column existed) simply
-- have no pharmacy on record; new orders from the rebuilt flow always set
-- it. No FK constraint to pharmacy-service's pharmacies table on purpose —
-- this system deliberately doesn't do cross-service foreign keys (each
-- service owns its own database; see MICROSERVICES_PLAN.md), same reasoning
-- as reviews.pharmacy_id's FK actually being a same-database reference
-- within pharmacy-service itself, which this isn't.
ALTER TABLE drug_orders ADD COLUMN pharmacy_id VARCHAR(255);
