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
}
