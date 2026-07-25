package com.pharmalink.pharmacy_service.service;

import com.pharmalink.pharmacy_service.client.OverpassClient;
import com.pharmalink.pharmacy_service.dto.PharmacySearchRequest;
import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.repository.PharmacyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

// Moved as-is from the monolith's service/PharmacyService.java.
@Service
public class PharmacyService {

    private final PharmacyRepository pharmacyRepository;
    private final OverpassClient overpassClient;

    public PharmacyService(PharmacyRepository pharmacyRepository, OverpassClient overpassClient) {
        this.pharmacyRepository = pharmacyRepository;
        this.overpassClient = overpassClient;
    }

    @Transactional(readOnly = true)
    public List<Pharmacy> getAllPharmacies() {
        return pharmacyRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Pharmacy> getPharmacyById(String id) {
        return pharmacyRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Pharmacy> getNearbyPharmacies(double lat, double lng, double radiusKm) {
        return pharmacyRepository.findNearby(lat, lng, radiusKm);
    }

    /**
     * Task 63 — merges PharmaLink-registered pharmacies (real stock,
     * orderable, always shown first) with live OpenStreetMap pharmacy
     * pins near the user (informational-only, see OverpassClient javadoc).
     * OSM pins within ~120m of an already-registered pharmacy are dropped —
     * that's close enough to almost certainly be the same physical pharmacy
     * (registered pharmacies are frequently ALSO mapped on OSM), so keeping
     * both would just show a confusing duplicate pin for the same building.
     */
    @Transactional(readOnly = true)
    public List<Pharmacy> getNearbyPharmaciesIncludingOsm(double lat, double lng, double radiusKm) {
        List<Pharmacy> registered = pharmacyRepository.findNearby(lat, lng, radiusKm);

        List<Pharmacy> osm = overpassClient.fetchNearbyPharmacies(lat, lng, radiusKm);
        List<Pharmacy> deduped = osm.stream()
            .filter(o -> registered.stream().noneMatch(r ->
                haversine(r.getLatitude(), r.getLongitude(), o.getLatitude(), o.getLongitude()) < 0.12))
            .collect(Collectors.toList());

        List<Pharmacy> combined = new ArrayList<>(registered);
        combined.addAll(deduped);
        return combined;
    }

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

            if (f.getLocation() != null && !f.getLocation().isBlank()) {
                String loc = f.getLocation().toLowerCase();
                candidates = candidates.stream()
                    .filter(p -> (p.getCity()    != null && p.getCity().toLowerCase().contains(loc))
                              || (p.getRegion()  != null && p.getRegion().toLowerCase().contains(loc))
                              || p.getAddress().toLowerCase().contains(loc))
                    .collect(Collectors.toList());
            }

            if (f.getRadius() != null && req.getUserLocation() != null) {
                double lat = req.getUserLocation().getLatitude();
                double lng = req.getUserLocation().getLongitude();
                double radius = f.getRadius();
                candidates = candidates.stream()
                    .filter(p -> haversine(lat, lng, p.getLatitude(), p.getLongitude()) <= radius)
                    .collect(Collectors.toList());
            }

            if (f.getServices() != null && !f.getServices().isEmpty()) {
                candidates = candidates.stream()
                    .filter(p -> p.getServices() != null &&
                                 f.getServices().stream().anyMatch(s -> p.getServices().contains(s)))
                    .collect(Collectors.toList());
            }

            if (f.getMinRating() != null) {
                double minRating = f.getMinRating();
                candidates = candidates.stream()
                    .filter(p -> p.getRating() >= minRating)
                    .collect(Collectors.toList());
            }

            if (Boolean.TRUE.equals(f.getOpenNow())) {
                candidates = candidates.stream()
                    .filter(Pharmacy::isOpen)
                    .collect(Collectors.toList());
            }

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

    // ── Admin-service support (MICROSERVICES_PLAN.md §6 step 7c) ───────────
    // Both under /internal/pharmacies/**, not /api/pharmacies/** — that
    // prefix is public+gateway-routed and permitAll at this service's own
    // SecurityConfig, so a create/verify mutation living there would be
    // callable by anyone. See InternalPharmacyController javadoc.

    public Pharmacy createPharmacy(Pharmacy pharmacy) {
        return pharmacyRepository.save(pharmacy);
    }

    public Pharmacy setVerified(String id, boolean verified) {
        Pharmacy pharmacy = pharmacyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pharmacy not found"));
        pharmacy.setVerified(verified);
        return pharmacyRepository.save(pharmacy);
    }

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
