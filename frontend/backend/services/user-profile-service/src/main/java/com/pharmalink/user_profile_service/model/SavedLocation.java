package com.pharmalink.user_profile_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// New (not carried over from the monolith — nothing there had this either).
// Backs the frontend's locationService.ts saved-address book: an
// address-picker feature that was calling `${API.base}/locations/**` and
// `${API.base}/users/{id}/locations/**`, routes that didn't exist anywhere
// in the gateway's table or in any of the 13 services (flagged in
// MICROSERVICES_PLAN.md / BACKEND_TODO.md as a genuine backend gap, not a
// wiring miss). Lives in user-profile-service because it's per-user data,
// same as Appointment — no new microservice/port needed for what's a small
// side table next to `profiles`.
@Entity
@Table(name = "saved_locations")
public class SavedLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    private String city;
    private String region;
    private String country;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private boolean isDefault = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    public SavedLocation() {}

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
