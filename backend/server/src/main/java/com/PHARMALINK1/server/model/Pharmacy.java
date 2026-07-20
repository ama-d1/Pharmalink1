package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "pharmacies", indexes = {
    @Index(name = "idx_pharmacy_city",   columnList = "city"),
    @Index(name = "idx_pharmacy_region", columnList = "region"),
    @Index(name = "idx_pharmacy_open",   columnList = "open")
})
public class Pharmacy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    private String city;
    private String region;
    private double latitude;
    private double longitude;
    private String phone;
    private String email;
    private String website;
    private String openHours;
    private double rating = 4.0;
    private int reviewCount = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "pharmacy_services", joinColumns = @JoinColumn(name = "pharmacy_id"))
    @Column(name = "service")
    private List<String> services;

    @Column(length = 1000)
    private String description;

    private boolean verified = false;

    // Renamed from isOpen → open to avoid Hibernate/PostgreSQL column naming conflict.
    // Hibernate maps boolean field "isOpen" → column "is_open" but then generates
    // the getter as isOpen() which PostgreSQL JDBC can confuse. Explicit @Column
    // name "open" and field name "open" avoids all ambiguity.
    @Column(name = "open")
    private boolean open = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Pharmacy() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getOpenHours() { return openHours; }
    public void setOpenHours(String openHours) { this.openHours = openHours; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public List<String> getServices() { return services; }
    public void setServices(List<String> services) { this.services = services; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public boolean isOpen() { return open; }
    public void setOpen(boolean open) { this.open = open; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
