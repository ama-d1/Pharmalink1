package com.pharmalink.user_profile_service.dto;

// Mirrors the frontend's `Omit<Location, 'id'>` shape (locationService.ts) —
// saveLocation() posts a Location object with an optional nested
// `coordinates: { latitude, longitude }`, not flat lat/lng fields, so this
// DTO nests the same way for Jackson to bind it directly.
public class SaveLocationRequest {
    private String name;
    private String address;
    private String city;
    private String region;
    private String country;
    private Coordinates coordinates;
    private Boolean isDefault;

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

    public Coordinates getCoordinates() { return coordinates; }
    public void setCoordinates(Coordinates coordinates) { this.coordinates = coordinates; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public static class Coordinates {
        private Double latitude;
        private Double longitude;

        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }

        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
    }
}
