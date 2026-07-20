package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.dto.PharmacySearchRequest;
import com.PHARMALINK1.server.model.Pharmacy;
import com.PHARMALINK1.server.repository.PharmacyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PharmacyService {

    private final PharmacyRepository pharmacyRepository;

    public PharmacyService(PharmacyRepository pharmacyRepository) {
        this.pharmacyRepository = pharmacyRepository;
    }

    // ── Basic queries ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Pharmacy> getAllPharmacies() {
        return pharmacyRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Pharmacy> getPharmacyById(String id) {
        return pharmacyRepository.findById(id);
    }

    // ── Nearby (Haversine) ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Pharmacy> getNearbyPharmacies(double lat, double lng, double radiusKm) {
        return pharmacyRepository.findNearby(lat, lng, radiusKm);
    }

    // ── Search + Filters ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Pharmacy> search(PharmacySearchRequest req) {
        List<Pharmacy> candidates;

        if (req.getQuery() != null && !req.getQuery().isBlank()) {
            candidates = pharmacyRepository.fullTextSearch(req.getQuery().trim());
        } else {
            candidates = pharmacyRepository.findAll();
        }

        PharmacySearchRequest.Filters f = req.getFilters();
        if (f != null) {

            // Location string filter (city / region)
            if (f.getLocation() != null && !f.getLocation().isBlank()) {
                String loc = f.getLocation().toLowerCase();
                candidates = candidates.stream()
                    .filter(p -> (p.getCity()    != null && p.getCity().toLowerCase().contains(loc))
                              || (p.getRegion()  != null && p.getRegion().toLowerCase().contains(loc))
                              || p.getAddress().toLowerCase().contains(loc))
                    .collect(Collectors.toList());
            }

            // Radius filter
            if (f.getRadius() != null && req.getUserLocation() != null) {
                double lat = req.getUserLocation().getLatitude();
                double lng = req.getUserLocation().getLongitude();
                double radius = f.getRadius();
                candidates = candidates.stream()
                    .filter(p -> haversine(lat, lng, p.getLatitude(), p.getLongitude()) <= radius)
                    .collect(Collectors.toList());
            }

            // Services filter
            if (f.getServices() != null && !f.getServices().isEmpty()) {
                candidates = candidates.stream()
                    .filter(p -> p.getServices() != null &&
                                 f.getServices().stream().anyMatch(s -> p.getServices().contains(s)))
                    .collect(Collectors.toList());
            }

            // Minimum rating
            if (f.getMinRating() != null) {
                double minRating = f.getMinRating();
                candidates = candidates.stream()
                    .filter(p -> p.getRating() >= minRating)
                    .collect(Collectors.toList());
            }

            // Open now
            if (Boolean.TRUE.equals(f.getOpenNow())) {
                candidates = candidates.stream()
                    .filter(Pharmacy::isOpen)
                    .collect(Collectors.toList());
            }

            // Sort
            if (f.getSortBy() != null) {
                switch (f.getSortBy()) {
                    case "rating"   -> candidates.sort(Comparator.comparingDouble(Pharmacy::getRating).reversed());
                    case "name"     -> candidates.sort(Comparator.comparing(Pharmacy::getName));
                    case "distance" -> {
                        if (req.getUserLocation() != null) {
                            double lat = req.getUserLocation().getLatitude();
                            double lng = req.getUserLocation().getLongitude();
                            candidates.sort(Comparator.comparingDouble(
                                p -> haversine(lat, lng, p.getLatitude(), p.getLongitude())
                            ));
                        }
                    }
                }
            }
        }

        return candidates;
    }

    @Transactional(readOnly = true)
    public List<Pharmacy> simpleSearch(String query) {
        if (query == null || query.isBlank()) return getAllPharmacies();
        return pharmacyRepository.fullTextSearch(query.trim());
    }

    // ── Haversine helper ──────────────────────────────────────────────────────

    public double haversine(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                   * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
