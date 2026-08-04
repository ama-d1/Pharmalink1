package com.pharmalink.auth_service.model;

/**
 * Where a sign-up verification code was sent (auth redesign, 2026-08-04).
 *
 * SMS is the default — the redesigned sign-up form collects a phone number
 * and texting the code is the shorter path for most users. EMAIL is both a
 * user-selectable alternative ("Send to my email instead" on the verification
 * screen) and the automatic fallback when SMS is unconfigured or the provider
 * rejects the send.
 *
 * Deliberately NOT persisted on User: which channel a given code went out on
 * is a property of that one send, not of the account, and the code itself is
 * identical either way.
 */
public enum VerificationChannel {
    SMS,
    EMAIL;

    /**
     * Lenient parse for the value clients send on /resend-verification.
     * Anything unrecognised falls back to the given default rather than
     * failing the request — a malformed channel is not a reason to leave
     * someone unable to receive a code.
     */
    public static VerificationChannel parseOrDefault(String raw, VerificationChannel fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return VerificationChannel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
