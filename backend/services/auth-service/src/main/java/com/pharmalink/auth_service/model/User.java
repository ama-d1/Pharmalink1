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

    @Column(nullable = false)
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

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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
