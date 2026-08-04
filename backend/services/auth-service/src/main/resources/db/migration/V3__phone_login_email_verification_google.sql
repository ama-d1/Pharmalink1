-- Auth redesign (2026-08-04). Three independent additions that all land in
-- this one table, so they share a migration:
--
--   1. phone_number    — logging in by phone means looking up credentials by
--                        phone, and credential lookup can only live in this
--                        service. user-profile-service keeps its own copy for
--                        display/editing; see User.phoneNumber's javadoc.
--   2. email_verified  — registration no longer issues a token immediately;
--                        the emailed code has to be confirmed first.
--   3. google_id       — Google's stable "sub" claim for a linked account.
--
-- password becomes nullable: a Google-only account has no local password.
-- Every read of it now null-checks first (AuthService.login()).

ALTER TABLE users ADD COLUMN phone_number VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uk_users_phone_number UNIQUE (phone_number);

-- DEFAULT true, not false, and that direction matters: every account that
-- already exists predates the verification flow and was never sent a code.
-- Defaulting to false would lock every single existing user out of the app
-- behind a code they can't obtain. register() sets false explicitly on the
-- rows it writes from here on.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN verification_code VARCHAR(255);
ALTER TABLE users ADD COLUMN verification_code_expiry TIMESTAMP;

ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uk_users_google_id UNIQUE (google_id);

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
