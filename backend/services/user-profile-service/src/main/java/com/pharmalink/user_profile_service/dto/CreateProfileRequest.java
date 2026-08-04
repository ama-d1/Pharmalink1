package com.pharmalink.user_profile_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

// Internal request — called by auth-service right after it creates a new
// User, so the profile row exists from day one. Not meant to be called by
// the frontend directly. See InternalProfileController.
public class CreateProfileRequest {

    @NotBlank
    private String userId;

    @NotBlank
    private String fullName;

    // No longer @NotBlank as of 2026-08-04: a Google sign-in creates an
    // account with no phone number, and rejecting that here would fail the
    // whole registration (createProfile is not best-effort — see
    // auth-service's ProfileClient javadoc).
    private String phoneNumber;

    // Added 2026-08-04 with the redesigned sign-up form. All three optional —
    // an older app build posts none of them, and Google can omit the name
    // claims entirely depending on granted scopes.
    private String firstName;

    private String lastName;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

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

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
