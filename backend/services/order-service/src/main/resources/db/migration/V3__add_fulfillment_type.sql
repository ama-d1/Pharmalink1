-- Added 2026-07-23 — delivery-vs-pickup choice now happens at checkout,
-- before payment. Existing rows default to DELIVERY (they were all
-- effectively deliveries, since pickup wasn't an option before this).
ALTER TABLE drug_orders ADD COLUMN fulfillment_type VARCHAR(255) NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE drug_orders ADD COLUMN delivery_fee DOUBLE PRECISION NOT NULL DEFAULT 0;
