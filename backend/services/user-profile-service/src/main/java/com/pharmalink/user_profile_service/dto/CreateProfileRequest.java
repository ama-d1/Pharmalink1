package com.pharmalink.user_profile_service.dto;

import jakarta.validation.constraints.NotBlank;

// Internal request — called by auth-service right after it creates a new
// User, so the profile row exists from day one. Not meant to be called by
// the frontend directly. See InternalProfileController.
public class CreateProfileRequest {

    @NotBlank
    private String userId;

    @NotBlank
    private String fullName;

    @NotBlank
    private String phoneNumber;

    // Added during chat-service extraction (step 5b) — denormalized onto
    // Profile for pharmacist search. See Profile's class javadoc.
    @NotBlank
    private String role;

    @NotBlank
    private String email;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
