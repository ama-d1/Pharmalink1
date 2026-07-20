package com.PHARMALINK1.server.model;

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

@Entity
@Table(name = "users")
public class User {

    public enum Role {
        PATIENT, PHARMACIST, ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.PATIENT;

    @Column(nullable = false)
    private boolean enabled = true;

    // Primitive boolean — avoids NullPointerException when Hibernate writes
    // a NOT NULL column. Boxed Boolean with @Column(nullable=false) will throw
    // a ConstraintViolationException if null is ever passed to the setter.
    @Column(nullable = false)
    private boolean notificationsEnabled = true;

    @Column(nullable = false)
    private boolean privacyMode = false;

    private String profilePictureUrl;
    private String bloodGroup;
    private String allergies;
    private String conditions;
    private Double adherenceRate = 0.0;
    private Integer dayStreak = 0;
    
    private String pharmacyId;
    private String pharmacyName;

    @Column(updatable = false)
    private LocalDateTime createdAt;

 @Column(unique=true)
private String resetToken;


private LocalDateTime resetTokenExpiry;

    private LocalDateTime updatedAt;

    public User() {}

   public String getResetToken(){
    return resetToken;
}


public void setResetToken(String resetToken){
    this.resetToken = resetToken;
}



public LocalDateTime getResetTokenExpiry(){
    return resetTokenExpiry;
}


public void setResetTokenExpiry(
LocalDateTime resetTokenExpiry
){
    this.resetTokenExpiry = resetTokenExpiry;
}
    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

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

    

    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }

    public String getPharmacyName() { return pharmacyName; }
    public void setPharmacyName(String pharmacyName) { this.pharmacyName = pharmacyName; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    public boolean isNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }

    public boolean isPrivacyMode() { return privacyMode; }
    public void setPrivacyMode(boolean privacyMode) { this.privacyMode = privacyMode; }
}