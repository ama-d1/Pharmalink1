package com.pharmalink.user_profile_service.dto;

// Mirrors the monolith's ProfileUpdateRequest field-for-field (parity during
// extraction). All fields optional/nullable — ProfileService only applies
// the ones that are non-null (partial update), same as before.
public class ProfileUpdateRequest {
    private String fullName;
    private String phoneNumber;
    private String profilePictureUrl;
    private String bloodGroup;
    private String allergies;
    private String conditions;
    private Boolean notificationsEnabled;
    private Boolean privacyMode;
    private Boolean communityAlerts;
    private Boolean appointmentReminders;
    private Boolean emailNotifications;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }
    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public Boolean getNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(Boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }
    public Boolean getPrivacyMode() { return privacyMode; }
    public void setPrivacyMode(Boolean privacyMode) { this.privacyMode = privacyMode; }
    public Boolean getCommunityAlerts() { return communityAlerts; }
    public void setCommunityAlerts(Boolean communityAlerts) { this.communityAlerts = communityAlerts; }
    public Boolean getAppointmentReminders() { return appointmentReminders; }
    public void setAppointmentReminders(Boolean appointmentReminders) { this.appointmentReminders = appointmentReminders; }
    public Boolean getEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }
}
