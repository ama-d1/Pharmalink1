package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * The sign-up form's payload. Reworked 2026-08-04 for the redesigned auth
 * screens, which split the single "Full name" field into First/Last name and
 * added a date of birth.
 *
 * fullName is kept as an OPTIONAL field rather than deleted: it's what
 * user-profile-service stores and what every "Hi, {name}" greeting in the app
 * reads, and older app builds still post it. When first/last name are sent,
 * {@link #resolveFullName()} composes them; when only fullName is sent (an old
 * client), that value is used as-is and the name parts are derived from it.
 */
public class RegisterRequest {

    private String firstName;

    private String lastName;

    // Legacy/compat — see class javadoc. Not @NotBlank any more; the
    // controller relies on resolveFullName() being non-blank instead, which
    // covers both the new and old shapes.
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    // Optional. The redesigned form asks for it, but nothing in the app
    // depends on having it, so a missing value must not block sign-up.
    // @Past rather than a hard minimum age: this app has no age gate, and
    // inventing one here would silently reject legitimate users.
    @Past(message = "Date of birth must be in the past")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

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

    /**
     * The display name to store, whichever shape the client posted in.
     * Blank-safe: returns "" rather than "null null" when nothing usable was
     * sent, so the caller can reject it with a clear message.
     */
    public String resolveFullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String composed = (first + " " + last).trim();
        if (!composed.isEmpty()) return composed;
        return fullName == null ? "" : fullName.trim();
    }

    /**
     * First name for user-profile-service. Falls back to the leading word of
     * fullName so an old client's single-field payload still populates it.
     */
    public String resolveFirstName() {
        if (firstName != null && !firstName.isBlank()) return firstName.trim();
        String full = fullName == null ? "" : fullName.trim();
        if (full.isEmpty()) return "";
        int space = full.indexOf(' ');
        return space < 0 ? full : full.substring(0, space);
    }

    /** Last name, with the same fullName fallback as {@link #resolveFirstName()}. */
    public String resolveLastName() {
        if (lastName != null && !lastName.isBlank()) return lastName.trim();
        String full = fullName == null ? "" : fullName.trim();
        int space = full.indexOf(' ');
        return space < 0 ? "" : full.substring(space + 1).trim();
    }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
