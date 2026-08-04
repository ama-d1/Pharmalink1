package com.pharmalink.pharmacy_service.controller;

import com.pharmalink.pharmacy_service.dto.PharmacySearchRequest;
import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.service.PharmacyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

// Moved as-is from the monolith's controller/PharmacyController.java.
@RestController
@RequestMapping("/api/pharmacies")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    // NOTE: Literal paths (/nearby, /search) MUST be declared before the
    // path-variable mapping (/{id}) so Spring MVC resolves them correctly.

    @GetMapping("/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") double radius) {

        // Task 63 — was pharmacyService.getNearbyPharmacies() (DB-only, so
        // the screen only ever showed the 3 hand-seeded rows regardless of
        // where the user actually was). Now also pulls live OpenStreetMap
        // pharmacy pins near the user — see PharmacyService's javadoc on
        // getNearbyPharmaciesIncludingOsm() and OverpassClient for why OSM
        // (no card/billing account needed) instead of Google Places.
        List<Pharmacy> pharmacies = pharmacyService.getNearbyPharmaciesIncludingOsm(lat, lng, radius);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Pharmacy p : pharmacies) {
            Map<String, Object> map = pharmacyToMap(p);
            double dist = pharmacyService.haversine(lat, lng, p.getLatitude(), p.getLongitude());
            map.put("distance", Math.round(dist * 10.0) / 10.0);
            // isRegistered=false means this pin came from OpenStreetMap, not
            // PharmaLink's own database — no stock/checkout exists for it.
            // The frontend uses this to route taps to a "get directions /
            // call" info sheet instead of the normal pharmacy-details page.
            boolean isOsm = p.getId() != null && p.getId().startsWith("osm-");
            map.put("isRegistered", !isOsm);
            map.put("source", isOsm ? "osm" : "pharmalink");
            result.add(map);
        }

        result.sort(Comparator.comparingDouble(m -> ((Number) m.get("distance")).doubleValue()));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> simpleSearch(
            @RequestParam(required = false) String q) {
        List<Pharmacy> pharmacies = pharmacyService.simpleSearch(q);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Pharmacy p : pharmacies) {
            result.add(pharmacyToMap(p));
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestBody PharmacySearchRequest req) {

        List<Pharmacy> pharmacies = pharmacyService.search(req);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Pharmacy p : pharmacies) {
            Map<String, Object> map = pharmacyToMap(p);
            if (req.getUserLocation() != null) {
                double dist = pharmacyService.haversine(
                    req.getUserLocation().getLatitude(),
                    req.getUserLocation().getLongitude(),
                    p.getLatitude(), p.getLongitude()
                );
                map.put("distance", Math.round(dist * 10.0) / 10.0);
            }
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Pharmacy> pharmacies = pharmacyService.getAllPharmacies();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Pharmacy p : pharmacies) {
            result.add(pharmacyToMap(p));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable String id) {
        return pharmacyService.getPharmacyById(id)
            .map(p -> ResponseEntity.ok(pharmacyToMap(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Pharmacy service is running!");
    }

    private Map<String, Object> pharmacyToMap(Pharmacy p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          p.getId());
        m.put("name",        p.getName());
        m.put("address",     p.getAddress());
        m.put("city",        p.getCity());
        m.put("region",      p.getRegion());
        m.put("latitude",    p.getLatitude());
        m.put("longitude",   p.getLongitude());
        m.put("phone",       p.getPhone());
        m.put("email",       p.getEmail());
        m.put("website",     p.getWebsite());
        m.put("openHours",   p.getOpenHours());
        m.put("rating",      p.getRating());
        m.put("reviewCount", p.getReviewCount());
        m.put("services",    p.getServices() != null ? p.getServices() : List.of());
        m.put("description", p.getDescription());
        m.put("verified",    p.isVerified());
        m.put("isOpen",      p.isOpen());
        // Every other endpoint here only ever deals in real DB rows — only
        // /nearby can also return OSM pins, and it overwrites these two
        // right after calling this helper. Defaulted here too so every
        // response shape is consistent for the frontend's Pharmacy type.
        m.put("isRegistered", true);
        m.put("source", "pharmalink");
        return m;
    }
}
