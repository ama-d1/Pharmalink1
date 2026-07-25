package com.pharmalink.pharmacy_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

// Moved as-is from the monolith's model/Pharmacy.java — no field changes.
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

    @Column(name = "open")
    private boolean open = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    // Added 2026-07-24 for real Paystack payment splitting (see
    // BACKEND_TODO.md's payment-splitting item, PayoutController, and this
    // service's new PaystackClient). bankCode/bankAccountNumber/
    // bankAccountName are captured when an OWNER links a bank account;
    // paystackSubaccountCode is what Paystack itself returns after
    // POST /subaccount succeeds, and is what actually gets passed as the
    // `subaccount` field on Initialize Transaction to split a payment 90/10
    // at the moment of checkout. subaccountActive is false until that whole
    // round trip succeeds — never set true on a partial/failed setup.
    @Column(name = "bank_code")
    private String bankCode;

    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "paystack_subaccount_code")
    private String paystackSubaccountCode;

    @Column(name = "subaccount_active", nullable = false)
    private boolean subaccountActive = false;

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

    public String getBankCode() { return bankCode; }
    public void setBankCode(String bankCode) { this.bankCode = bankCode; }

    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getPaystackSubaccountCode() { return paystackSubaccountCode; }
    public void setPaystackSubaccountCode(String paystackSubaccountCode) { this.paystackSubaccountCode = paystackSubaccountCode; }

    public boolean isSubaccountActive() { return subaccountActive; }
    public void setSubaccountActive(boolean subaccountActive) { this.subaccountActive = subaccountActive; }
}
