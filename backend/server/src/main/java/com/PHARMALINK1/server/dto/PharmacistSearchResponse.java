package com.PHARMALINK1.server.dto;

public class PharmacistSearchResponse {
    private String id;
    private String fullName;
    private String pharmacyId;
    private String pharmacyName;
    private String email;

    public PharmacistSearchResponse() {}

    public PharmacistSearchResponse(String id, String fullName, String pharmacyId, String pharmacyName, String email) {
        this.id = id;
        this.fullName = fullName;
        this.pharmacyId = pharmacyId;
        this.pharmacyName = pharmacyName;
        this.email = email;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }
    public String getPharmacyName() { return pharmacyName; }
    public void setPharmacyName(String pharmacyName) { this.pharmacyName = pharmacyName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
