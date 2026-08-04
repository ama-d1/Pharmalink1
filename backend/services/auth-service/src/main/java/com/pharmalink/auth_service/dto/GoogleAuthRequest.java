package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Google sign-in (auth redesign, 2026-08-04). Carries the ID token the app
 * received from Google — a signed JWT, not an access token and not a raw
 * email. The server verifies it with Google before trusting a single field
 * inside it (see GoogleTokenVerifier); the client is never asked to say who
 * it is, because a client can always lie about that.
 */
public class GoogleAuthRequest {

    @NotBlank(message = "Google ID token is required")
    private String idToken;

    public GoogleAuthRequest() {}

    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
}
