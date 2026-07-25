-- Coming-soon roadmap item #9 (COMING_SOON_ROADMAP.md): "Two-factor
-- authentication", shipped as email-based one-time codes. Defaults false
-- (opt-in, unlike the notification toggles elsewhere which default true) —
-- this is a security feature the user chooses to turn on, not a
-- convenience default.
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN two_factor_code VARCHAR(255);
ALTER TABLE users ADD COLUMN two_factor_code_expiry TIMESTAMP;
