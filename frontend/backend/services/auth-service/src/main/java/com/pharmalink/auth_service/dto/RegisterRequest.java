package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    // Phase 2 (MICROSERVICES_PLAN.md §6 step 8): now matches
    // frontend/utils/validation.ts's getPasswordError() exactly — min=6 was
    // deliberately kept during extraction for parity, but that gap (frontend
    // enforces 8+/upper/lower/number/symbol, backend only checked min=6) was
    // always flagged as a Phase 2 fix, not forgotten. Jakarta Validation's
    // constraint annotations are @Repeatable, so stacking multiple @Pattern
    // checks on one field is standard, not a workaround.
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = ".*[A-Z].*", message = "Password must contain an uppercase letter")
    @Pattern(regexp = ".*[a-z].*", message = "Password must contain a lowercase letter")
    @Pattern(regexp = ".*[0-9].*", message = "Password must contain a number")
    @Pattern(regexp = ".*[^A-Za-z0-9].*", message = "Password must contain a special character")
    private String password;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    public RegisterRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
