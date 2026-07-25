-- Coming-soon roadmap item #3 (COMING_SOON_ROADMAP.md): backs the
-- "Community Activity" notification settings toggle. Defaults true for
-- every existing row (opt-out), matching notifications_enabled's convention.
ALTER TABLE profiles ADD COLUMN community_alerts BOOLEAN NOT NULL DEFAULT true;
