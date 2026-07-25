package com.pharmalink.pharmacy_service.dto;

import java.util.List;

// Moved as-is from the monolith's dto/PharmacySearchRequest.java.
public class PharmacySearchRequest {

    private String query;
    private UserLocation userLocation;
    private Filters filters;

    public static class UserLocation {
        private double latitude;
        private double longitude;

        public double getLatitude() { return latitude; }
        public void setLatitude(double latitude) { this.latitude = latitude; }

        public double getLongitude() { return longitude; }
        public void setLongitude(double longitude) { this.longitude = longitude; }
    }

    public static class Filters {
        private String location;
        private Double radius;
        private List<String> services;
        private Double minRating;
        private Boolean openNow;
        private String sortBy; // "distance" | "rating" | "name"

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Double getRadius() { return radius; }
        public void setRadius(Double radius) { this.radius = radius; }

        public List<String> getServices() { return services; }
        public void setServices(List<String> services) { this.services = services; }

        public Double getMinRating() { return minRating; }
        public void setMinRating(Double minRating) { this.minRating = minRating; }

        public Boolean getOpenNow() { return openNow; }
        public void setOpenNow(Boolean openNow) { this.openNow = openNow; }

        public String getSortBy() { return sortBy; }
        public void setSortBy(String sortBy) { this.sortBy = sortBy; }
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public UserLocation getUserLocation() { return userLocation; }
    public void setUserLocation(UserLocation userLocation) { this.userLocation = userLocation; }

    public Filters getFilters() { return filters; }
    public void setFilters(Filters filters) { this.filters = filters; }
}
