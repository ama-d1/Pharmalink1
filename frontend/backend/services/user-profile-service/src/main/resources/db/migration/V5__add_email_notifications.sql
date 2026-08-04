-- Coming-soon roadmap item #6 (COMING_SOON_ROADMAP.md): "Email
-- notifications". Gates whether notification-service also emails a user
-- for ORDER_STATUS/APPOINTMENT_REMINDER events (the only two types that
-- trigger email, per your call — community activity/chat stay in-app-only
-- to avoid emailing on every comment/message). Defaults true (opt-out),
-- same convention as every other notification toggle added this session.
ALTER TABLE profiles ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT true;
