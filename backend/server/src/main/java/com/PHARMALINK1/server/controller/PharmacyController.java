package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.PharmacySearchRequest;
import com.PHARMALINK1.server.model.Pharmacy;
import com.PHARMALINK1.server.service.PharmacyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/pharmacies")
@CrossOrigin(origins = "*")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    // ── NOTE: Literal paths (/nearby, /search) MUST be declared before the
    // ── path-variable mapping (/{id}) so Spring MVC resolves them correctly.

    /**
     * GET /api/pharmacies/nearby?lat=X&lng=Y&radius=Z
     * Returns pharmacies within radiusKm, sorted nearest-first,
     * each with a computed "distance" field (km, 1 decimal place).
     */
    @GetMapping("/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") double radius) {

        List<Pharmacy> pharmacies = pharmacyService.getNearbyPharmacies(lat, lng, radius);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Pharmacy p : pharmacies) {
            Map<String, Object> map = pharmacyToMap(p);
            double dist = pharmacyService.haversine(lat, lng, p.getLatitude(), p.getLongitude());
            map.put("distance", Math.round(dist * 10.0) / 10.0);
            result.add(map);
        }

        result.sort(Comparator.comparingDouble(m -> ((Number) m.get("distance")).doubleValue()));
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/pharmacies/search?q=query  (simple text search)
     * Returns the same map shape as POST /search for consistency.
     */
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

    /**
     * POST /api/pharmacies/search
     * Body: { query, userLocation: {latitude, longitude}, filters: {...} }
     */
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

    /**
     * GET /api/pharmacies
     * Returns all pharmacies as frontend-safe maps.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Pharmacy> pharmacies = pharmacyService.getAllPharmacies();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Pharmacy p : pharmacies) {
            result.add(pharmacyToMap(p));
        }
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/pharmacies/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable String id) {
        return pharmacyService.getPharmacyById(id)
            .map(p -> ResponseEntity.ok(pharmacyToMap(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

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
        return m;
    }
}
