package com.pharmalink.pharmacy_service.controller;

import com.pharmalink.pharmacy_service.client.ProfileClient;
import com.pharmalink.pharmacy_service.model.PharmacyStock;
import com.pharmalink.pharmacy_service.security.AuthContext;
import com.pharmalink.pharmacy_service.service.PharmacyStockService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Added 2026-07-23 — pharmacist-facing stock/pricing management, plus the
 * public cross-pharmacy price-comparison search that powers the Home
 * screen's rebuilt Order Meds flow. See PharmacyStock's class javadoc for
 * the full feature context.
 *
 * Ownership model: a pharmacist may only write (POST/DELETE) stock for the
 * pharmacy they're actually assigned to (per user-profile-service's
 * Profile.pharmacyId — see ProfileClient.getPharmacyIdForUser()), never
 * whatever pharmacyId happens to be in the URL path. Reads (GET) are public,
 * same as pharmacy listings and reviews — there's no reason to hide prices.
 */
@RestController
public class PharmacyStockController {

    private final PharmacyStockService stockService;
    private final ProfileClient profileClient;

    public PharmacyStockController(PharmacyStockService stockService, ProfileClient profileClient) {
        this.stockService = stockService;
        this.profileClient = profileClient;
    }

    @GetMapping("/api/pharmacies/{pharmacyId}/stock")
    public ResponseEntity<List<PharmacyStock>> getStock(@PathVariable String pharmacyId) {
        return ResponseEntity.ok(stockService.getStockForPharmacy(pharmacyId));
    }

    @PostMapping("/api/pharmacies/{pharmacyId}/stock")
    public ResponseEntity<?> upsertStock(
            @PathVariable String pharmacyId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        ResponseEntity<?> denied = checkPharmacyOwnership(request, pharmacyId);
        if (denied != null) return denied;

        Object drugId = body.get("drugId");
        Object drugName = body.get("drugName");
        Object priceRaw = body.get("price");
        Object quantityRaw = body.get("quantity");
        if (!(drugId instanceof String) || !(drugName instanceof String)
                || !(priceRaw instanceof Number) || !(quantityRaw instanceof Number)) {
            return ResponseEntity.badRequest().body(Map.of("message", "drugId, drugName, price, and quantity are required"));
        }

        // Added 2026-07-23 — optional; a data: URI string from the frontend's
        // image picker. Absent/null means "leave the existing photo alone"
        // (see PharmacyStockService.upsertStock's javadoc on that
        // distinction) — a plain price/quantity edit shouldn't require
        // re-sending the whole image every time.
        Object imageRaw = body.get("imageBase64");
        String imageBase64 = imageRaw instanceof String s ? s : null;

        try {
            PharmacyStock saved = stockService.upsertStock(
                    pharmacyId, (String) drugId, (String) drugName,
                    ((Number) priceRaw).doubleValue(), ((Number) quantityRaw).intValue(), imageBase64);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/api/pharmacies/{pharmacyId}/stock/{stockId}")
    public ResponseEntity<?> deleteStock(
            @PathVariable String pharmacyId,
            @PathVariable String stockId,
            HttpServletRequest request) {

        ResponseEntity<?> denied = checkPharmacyOwnership(request, pharmacyId);
        if (denied != null) return denied;

        try {
            stockService.deleteStock(pharmacyId, stockId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    // Public — any logged-in user searching for a medication. Deliberately
    // NOT restricted to a specific role: this is the same audience as
    // pharmacy listings/reviews. Path is "/stock-search" rather than nested
    // under /api/pharmacies/{pharmacyId}/stock to avoid any ambiguity with
    // the pharmacist-scoped routes above.
    @GetMapping("/api/pharmacies/stock-search")
    public ResponseEntity<List<Map<String, Object>>> searchAcrossPharmacies(@RequestParam String drugName) {
        return ResponseEntity.ok(stockService.searchAcrossPharmacies(drugName));
    }

    private ResponseEntity<?> checkPharmacyOwnership(HttpServletRequest request, String pharmacyId) {
        if (AuthContext.isAdmin(request)) return null;

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        boolean ownsThisPharmacy = profileClient.getPharmacyIdForUser(userId)
                .map(pharmacyId::equals)
                .orElse(false);
        if (!ownsThisPharmacy) {
            return ResponseEntity.status(403).body(Map.of("message", "You may only manage your own pharmacy's stock"));
        }
        return null;
    }
}
