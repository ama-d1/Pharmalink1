-- Added 2026-07-24 for real Paystack payment splitting — records which
-- pharmacy subaccount (if any) a payment was split to. Nullable: most
-- historical rows (and any pharmacy that hasn't onboarded yet) have none.
ALTER TABLE payments ADD COLUMN subaccount_code VARCHAR(255);
