-- Auth redesign (2026-08-04). The redesigned sign-up form asks for first
-- name, last name and date of birth instead of a single "Full name" field.
--
-- full_name is deliberately kept and still the field the app displays —
-- ~30 screens read it, and a profile created by an older build or by Google
-- sign-in can have a full_name with no clean split. These three columns are
-- additive detail, so all three are nullable.
ALTER TABLE profiles ADD COLUMN first_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN last_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN date_of_birth DATE;

-- Google sign-in creates an account with no phone number at all — the user
-- is never asked for one, so NOT NULL here would make one-tap sign-in
-- impossible. Existing rows are unaffected by dropping a NOT NULL.
ALTER TABLE profiles ALTER COLUMN phone_number DROP NOT NULL;
