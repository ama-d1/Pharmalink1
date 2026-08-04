package com.pharmalink.auth_service.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Identity/credentials record — auth-service's entire reason for existing.
 *
 * Per the confirmed microservices split (MICROSERVICES_PLAN.md §1), this
 * service owns ONLY: id, email, password, role, enabled, resetToken,
 * resetTokenExpiry. No other service may read/write this table directly —
 * they only ever get a userId string.
 *
 * fullName/phoneNumber used to be temporarily duplicated here (see git
 * history / MICROSERVICES_PLAN.md §6 step 1) until user-profile-service
 * existed. Now that it does, those columns were removed — AuthService calls
 * out to user-profile-service at registration time instead.
 */
@Entity
@Table(name = "users")
public class User {

    // DRIVER added 2026-07-23 for the delivery system — admin-provisioned
    // the same way PHARMACIST is (see admin-service's setUserRoleWithPharmacy
    // pattern), not a self-signup role. No new migration needed: role is a
    // plain VARCHAR(255) with no CHECK constraint (see V1__init.sql), so a
    // new enum constant here is the only change required.
    public enum Role {
        PATIENT, PHARMACIST, ADMIN, DRIVER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String email;

    /**
     * Added 2026-08-04 with the auth redesign, which put a Phone Number /
     * Email toggle on the login screen. Phone was already collected at
     * registration but only ever stored in user-profile-service — which is
     * fine for display, not for authentication: logging in by phone means
     * looking up credentials by phone, and no service other than this one is
     * allowed to own credential lookup (MICROSERVICES_PLAN.md §1). So the
     * number is stored in BOTH places for two different reasons: here as a
     * login identifier, there as profile data. user-profile-service's copy
     * stays the one the app displays/edits.
     *
     * Nullable because Google sign-in creates accounts with no phone at all,
     * and every account that existed before this migration has none here.
     * Unique so two accounts can never claim the same login identifier —
     * Postgres allows any number of NULLs under a UNIQUE constraint, which
     * is exactly the behaviour needed.
     */
    @Column(unique = true)
    private String phoneNumber;

    /**
     * Nullable since 2026-08-04: a Google-only account has no local password.
     * Everything that reads this must null-check first — see AuthService's
     * login(), which rejects a password login against a Google-only account
     * rather than passing null to PasswordEncoder.matches().
     */
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.PATIENT;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(unique = true)
    private String resetToken;

    private LocalDateTime resetTokenExpiry;

    // Coming-soon roadmap item #9 (COMING_SOON_ROADMAP.md): "Two-factor
    // authentication". Shipped as email-based one-time codes, per your
    // call (TOTP was recommended for no ongoing cost, but you chose email
    // — reuses the SMTP work already in place). Defaults false (opt-in) —
    // unlike every notification toggle, this is a security feature you
    // choose to add, not a default-on convenience.
    @Column(nullable = false)
    private boolean twoFactorEnabled = false;

    // Same pattern as resetToken/resetTokenExpiry above, but deliberately
    // NOT unique (a 6-digit numeric code has real collision odds across a
    // large user base, unlike a UUID reset token) — verifyTwoFactorCode()
    // scopes the lookup to a specific userId anyway, so uniqueness isn't
    // needed for correctness.
    private String twoFactorCode;

    private LocalDateTime twoFactorCodeExpiry;

    /**
     * Added 2026-08-04 (auth redesign). Registration no longer issues a token
     * straight away — the account exists but cannot log in until the emailed
     * code is confirmed. Deliberately a SEPARATE flag from {@link #enabled}
     * rather than reusing it: `enabled` is the admin's account-suspension
     * switch (admin-service toggles it), and folding "never verified" into
     * the same column would make a suspended account and an unverified one
     * indistinguishable in the admin dashboard.
     *
     * Defaults true at the column level in the migration so every account
     * that predates this feature keeps working; new rows written by
     * register() set it to false explicitly.
     */
    @Column(nullable = false)
    private boolean emailVerified = true;

    // 4-digit code emailed at registration. Same shape as the 2FA pair above
    // but a separate field on purpose — the two flows can legitimately be in
    // flight at once (an unverified user with 2FA enabled), and sharing one
    // column would let one overwrite the other's code.
    private String verificationCode;

    private LocalDateTime verificationCodeExpiry;

    /**
     * Google's stable subject claim ("sub") for a linked Google account.
     * Not the email — Google explicitly documents email as mutable and
     * non-unique over time, while sub never changes for a given account.
     * Null for password-only accounts.
     */
    @Column(unique = true)
    private String googleId;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public LocalDateTime getResetTokenExpiry() { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime resetTokenExpiry) { this.resetTokenExpiry = resetTokenExpiry; }

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorCode() { return twoFactorCode; }
    public void setTwoFactorCode(String twoFactorCode) { this.twoFactorCode = twoFactorCode; }

    public LocalDateTime getTwoFactorCodeExpiry() { return twoFactorCodeExpiry; }
    public void setTwoFactorCodeExpiry(LocalDateTime twoFactorCodeExpiry) { this.twoFactorCodeExpiry = twoFactorCodeExpiry; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getVerificationCode() { return verificationCode; }
    public void setVerificationCode(String verificationCode) { this.verificationCode = verificationCode; }

    public LocalDateTime getVerificationCodeExpiry() { return verificationCodeExpiry; }
    public void setVerificationCodeExpiry(LocalDateTime verificationCodeExpiry) { this.verificationCodeExpiry = verificationCodeExpiry; }

    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
