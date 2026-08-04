package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Reworked 2026-08-04 (auth redesign): the login screen now has a Phone
 * Number / Email toggle, so the credential this carries is an *identifier*,
 * not necessarily an email.
 *
 * The old {@code email} field is kept and still accepted — older app builds
 * post it, and admin-login posts it too. What had to go is the {@code @Email}
 * constraint that used to sit on it: it would reject "+233241234567" at the
 * validation layer, before any code could look at it. Format checking moved
 * to {@link #isEmailIdentifier()}, which decides which lookup to run rather
 * than rejecting one of the two valid shapes outright.
 */
public class LoginRequest {

    // Either an email address or a phone number. Optional at the annotation
    // level because a request may send `email` instead; resolveIdentifier()
    // is what the @NotBlank guarantee actually applies to (checked in
    // AuthService, since Jakarta can't express "one of these two").
    private String identifier;

    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    public LoginRequest() {}

    /** Whichever of the two fields the client populated, trimmed. */
    public String resolveIdentifier() {
        if (identifier != null && !identifier.isBlank()) return identifier.trim();
        return email == null ? "" : email.trim();
    }

    /**
     * An "@" is the only thing that reliably separates the two shapes here —
     * phone numbers never contain one, and any email that doesn't is invalid
     * anyway. Deliberately not a full email regex: this only chooses which
     * repository lookup to run, and a malformed address simply finds no user.
     */
    public boolean isEmailIdentifier() {
        return resolveIdentifier().contains("@");
    }

    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
