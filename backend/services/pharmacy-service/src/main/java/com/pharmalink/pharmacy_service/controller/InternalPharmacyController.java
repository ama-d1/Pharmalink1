package com.pharmalink.pharmacy_service.controller;

import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.service.PharmacyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Service-to-service only — backs admin-service's pharmacy management
 * screen (create + verify). Reading pharmacies stays on the existing public
 * GET /api/pharmacies (that data is already public/non-sensitive, so
 * admin-service just reuses it — no need to duplicate a read endpoint
 * here). Create/verify are mutations though, so they live under
 * /internal/pharmacies/**, not the public /api/pharmacies/** prefix — same
 * reasoning as every other internal endpoint in this system: no gateway
 * route means unreachable from outside, which is the only real protection
 * until Phase 2's role-based auth exists.
 */
@RestController
@RequestMapping("/internal/pharmacies")
public class InternalPharmacyController {

    private final PharmacyService pharmacyService;

    public InternalPharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @PostMapping
    public ResponseEntity<Pharmacy> create(@RequestBody Pharmacy pharmacy) {
        return ResponseEntity.ok(pharmacyService.createPharmacy(pharmacy));
    }

    @PatchMapping("/{id}/verify")
    public ResponseEntity<?> setVerified(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        try {
            Boolean verified = body.get("verified");
            if (verified == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "verified is required"));
            }
            return ResponseEntity.ok(pharmacyService.setVerified(id, verified));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }
}
