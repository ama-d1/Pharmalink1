-- Coming-soon roadmap item #7 (COMING_SOON_ROADMAP.md): appointment
-- reminders. reminder_sent tracks whether AppointmentReminderScheduler has
-- already notified for a given appointment (prevents double-notifying on
-- every scheduler run); appointment_reminders is the user-facing settings
-- toggle gating whether they get notified at all. Both default to their
-- "safe" value for existing rows: reminder_sent=false (so no existing
-- appointment is silently skipped), appointment_reminders=true (opt-out,
-- matching every other notification toggle's convention).
ALTER TABLE appointments ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN appointment_reminders BOOLEAN NOT NULL DEFAULT true;
