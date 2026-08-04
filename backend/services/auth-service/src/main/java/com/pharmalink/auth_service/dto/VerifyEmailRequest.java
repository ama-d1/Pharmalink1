package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Completes the registration started by /api/auth/register, which no longer
 * issues a token on its own (auth redesign, 2026-08-04). Shaped like
 * TwoFactorVerifyRequest but kept separate — the two flows verify different
 * things (identity at sign-up vs. a second factor at login) and only happen
 * to share a payload shape today.
 */
public class VerifyEmailRequest {

    @NotBlank(message = "User id is required")
    private String userId;

    @NotBlank(message = "Verification code is required")
    private String code;

    public VerifyEmailRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
