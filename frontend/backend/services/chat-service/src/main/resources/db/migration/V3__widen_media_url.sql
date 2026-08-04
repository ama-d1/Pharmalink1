-- Added 2026-07-24 for real voice-note/video-clip messages. messages.media_url
-- was never given an explicit column type (Message.java's mediaUrl field had
-- no @Column annotation), so Hibernate defaulted it to VARCHAR(255) — far too
-- small to hold a base64 data URI for an audio or video clip. Widening to
-- TEXT (unbounded, like messages.content already is) is what actually makes
-- sending a voice note or video clip possible instead of silently truncating
-- or failing on insert.
ALTER TABLE messages ALTER COLUMN media_url TYPE TEXT;
