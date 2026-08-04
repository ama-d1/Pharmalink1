-- Added 2026-07-24 — real Paystack payment splitting (90% pharmacy / 10%
-- platform). See Pharmacy.java's field-block javadoc for the meaning of
-- each column. subaccount_active defaults false so existing rows (every
-- pharmacy created before this migration) start out with "no split" —
-- payment-service treats that as "pay the platform in full" rather than
-- erroring checkout, until an OWNER links a real bank account.
ALTER TABLE pharmacies ADD COLUMN bank_code VARCHAR(255);
ALTER TABLE pharmacies ADD COLUMN bank_account_number VARCHAR(255);
ALTER TABLE pharmacies ADD COLUMN bank_account_name VARCHAR(255);
ALTER TABLE pharmacies ADD COLUMN paystack_subaccount_code VARCHAR(255);
ALTER TABLE pharmacies ADD COLUMN subaccount_active BOOLEAN NOT NULL DEFAULT false;
