package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {

    @NotBlank(message = "Token is required")
    private String token;

    // Phase 2: same policy as RegisterRequest — see its comment. A reset
    // password is still a newly-created password, so the same rules apply
    // (matches frontend/utils/validation.ts's getPasswordError(), used at
    // both Register and Reset Password per its own comment).
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = ".*[A-Z].*", message = "Password must contain an uppercase letter")
    @Pattern(regexp = ".*[a-z].*", message = "Password must contain a lowercase letter")
    @Pattern(regexp = ".*[0-9].*", message = "Password must contain a number")
    @Pattern(regexp = ".*[^A-Za-z0-9].*", message = "Password must contain a special character")
    private String password;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
