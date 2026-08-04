package com.pharmalink.user_profile_service.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Non-credential user data — profile, health fields, settings, pharmacy
 * affiliation. Identity/credentials (email, password, role, enabled) stay
 * in auth-service; this table is keyed by the SAME userId (auth-service's
 * User.id) but lives in its own database (pharmalink_profile) with no
 * foreign key across the boundary — cross-database FKs aren't possible and
 * wouldn't respect service isolation anyway.
 *
 * NOTE: dose-log-driven adherence tracking (adherenceRate/dayStreak
 * increments) was intentionally dropped during this extraction — see
 * MICROSERVICES_PLAN.md. These two fields still exist here (carried over
 * from the monolith's User) but nothing currently updates them; that comes
 * back once medication-service exists and owns DoseLog.
 *
 * role/email (added during chat-service extraction, step 5b): DENORMALIZED
 * READ-ONLY COPIES, not the source of truth. auth-service still owns both —
 * these exist purely so this service can serve chat-service's pharmacist
 * search (role + pharmacyId/name in one query) and display email in results,
 * without a second network hop back to auth-service on every search. Set
 * once at profile-creation time by auth-service's register() call; never
 * updated afterward. If a user's role or email ever changes in auth-service
 * (admin action, email change flow), this copy goes stale — there's no
 * event/sync mechanism wiring auth-service changes back to here. Acceptable
 * today because roles/emails essentially never change post-registration in
 * this app, but worth knowing if that assumption stops holding.
 */
@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    private String userId;

    @Column(nullable = false)
    private String fullName;

    /**
     * Nullable since 2026-08-04 (auth redesign): Google sign-in creates an
     * account with no phone number at all, and blocking profile creation on
     * a field the user was never asked for would make one-tap sign-in
     * impossible. Every other route into this service still collects it.
     */
    private String phoneNumber;

    /**
     * firstName/lastName/dateOfBirth added 2026-08-04 — the redesigned
     * sign-up form collects them. fullName is NOT derived from these at read
     * time and stays the field the whole app displays: ~30 screens already
     * read it, and an account created by an older build (or by Google with
     * no name claims) can have a fullName with nothing to split. These three
     * are additive detail, nullable throughout for exactly that reason.
     */
    private String firstName;

    private String lastName;

    private LocalDate dateOfBirth;

    // Denormalized from auth-service — see class javadoc.
    @Column(nullable = false)
    private String role;

    // Denormalized from auth-service — see class javadoc.
    @Column(nullable = false)
    private String email;

    private String profilePictureUrl;
    private String bloodGroup;
    private String allergies;
    private String conditions;

    // Frozen for now — see class javadoc.
    private Double adherenceRate = 0.0;
    private Integer dayStreak = 0;

    @Column(nullable = false)
    private boolean notificationsEnabled = true;

    @Column(nullable = false)
    private boolean privacyMode = false;

    // Coming-soon roadmap item #3 (COMING_SOON_ROADMAP.md): gates whether
    // community-service notifies this user when someone comments on their
    // post. Defaults true (opt-out), same convention as notificationsEnabled.
    @Column(nullable = false)
    private boolean communityAlerts = true;

    // Coming-soon roadmap item #7 (COMING_SOON_ROADMAP.md): gates whether
    // AppointmentReminderScheduler notifies this user 24h before an
    // appointment. Defaults true (opt-out), same convention as the other
    // notification toggles.
    @Column(nullable = false)
    private boolean appointmentReminders = true;

    // Coming-soon roadmap item #6 (COMING_SOON_ROADMAP.md): gates whether
    // notification-service also emails this user for ORDER_STATUS/
    // APPOINTMENT_REMINDER notifications (the only two types that ever
    // trigger an email — see NotificationService javadoc). Defaults true
    // (opt-out), same convention as every other notification toggle.
    @Column(nullable = false)
    private boolean emailNotifications = true;

    private String pharmacyId;
    private String pharmacyName;

    // Added 2026-07-23 — a pharmacy can have multiple staff accounts now
    // (an OWNER plus any number of MANAGERs), all sharing the same
    // pharmacyId above. "OWNER"/"MANAGER" as a plain string (not an enum)
    // matches this same class's existing denormalized-role convention.
    // Both tiers can manage stock/pricing identically today — the
    // distinction exists for future owner-only actions (e.g. removing a
    // manager) that aren't built yet.
    private String pharmacyRole;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Profile() {}

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

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }

    public Double getAdherenceRate() { return adherenceRate; }
    public void setAdherenceRate(Double adherenceRate) { this.adherenceRate = adherenceRate; }

    public Integer getDayStreak() { return dayStreak; }
    public void setDayStreak(Integer dayStreak) { this.dayStreak = dayStreak; }

    public boolean isNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }

    public boolean isPrivacyMode() { return privacyMode; }
    public void setPrivacyMode(boolean privacyMode) { this.privacyMode = privacyMode; }

    public boolean isCommunityAlerts() { return communityAlerts; }
    public void setCommunityAlerts(boolean communityAlerts) { this.communityAlerts = communityAlerts; }

    public boolean isAppointmentReminders() { return appointmentReminders; }
    public void setAppointmentReminders(boolean appointmentReminders) { this.appointmentReminders = appointmentReminders; }

    public boolean isEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(boolean emailNotifications) { this.emailNotifications = emailNotifications; }

    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }

    public String getPharmacyName() { return pharmacyName; }
    public void setPharmacyName(String pharmacyName) { this.pharmacyName = pharmacyName; }

    public String getPharmacyRole() { return pharmacyRole; }
    public void setPharmacyRole(String pharmacyRole) { this.pharmacyRole = pharmacyRole; }

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
