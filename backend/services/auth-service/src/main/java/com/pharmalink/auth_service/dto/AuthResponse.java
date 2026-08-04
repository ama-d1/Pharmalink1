package com.pharmalink.auth_service.dto;

public class AuthResponse {

    private String token;
    private String userId;
    private String fullName;
    private String email;
    private String role;
    private String message;

    // Coming-soon roadmap item #9: true means password was correct but a
    // one-time code was just emailed instead of issuing a token — token
    // will be null in that case. Frontend checks this before treating a
    // 200 response with no token as a failure. Defaults false so every
    // existing call site (register, plain login, error responses) that
    // doesn't set it explicitly is unaffected.
    private boolean requires2FA = false;

    /**
     * Auth redesign (2026-08-04): true means the account exists but its email
     * address has never been confirmed, so no token is issued — the app must
     * send the user to the verification-code screen. Set by register() (always)
     * and by login() (when an unverified account tries to sign in, which
     * re-sends the code rather than dead-ending).
     *
     * Kept distinct from requires2FA above even though both mean "here's a
     * userId, go collect a code": the two screens say different things, the
     * codes are stored in different columns, and an unverified account with
     * 2FA enabled would otherwise be ambiguous.
     */
    private boolean requiresVerification = false;

    /**
     * "SMS" or "EMAIL" — which channel the code just went out on. Only set
     * alongside requiresVerification. The app shows "sent to your phone" vs
     * "sent to your email" from this rather than assuming, because SMS falls
     * back to email on its own when the provider is unconfigured or fails.
     */
    private String verificationChannel;

    /**
     * A masked destination ("•••• 4567", "j•••@gmail.com") so the user can
     * confirm it's theirs. Masked because userId isn't a secret — see
     * AuthService.maskDestination().
     */
    private String verificationTarget;

    public AuthResponse() {}

    public AuthResponse(String token, String userId, String fullName, String email, String role, String message) {
        this.token = token;
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.message = message;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRequires2FA() { return requires2FA; }
    public void setRequires2FA(boolean requires2FA) { this.requires2FA = requires2FA; }

    public boolean isRequiresVerification() { return requiresVerification; }
    public void setRequiresVerification(boolean requiresVerification) { this.requiresVerification = requiresVerification; }

    public String getVerificationChannel() { return verificationChannel; }
    public void setVerificationChannel(String verificationChannel) { this.verificationChannel = verificationChannel; }

    public String getVerificationTarget() { return verificationTarget; }
    public void setVerificationTarget(String verificationTarget) { this.verificationTarget = verificationTarget; }
}
