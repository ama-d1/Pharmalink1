package com.pharmalink.admin_service.controller;

import com.pharmalink.admin_service.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

// Routes match frontend/services/adminService.ts exactly — that file was
// already built against this contract (BACKEND_TODO.md documented it before
// this service existed), every call previously 404ing.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Users ────────────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers(@RequestParam(required = false) String q) {
        try {
            return ResponseEntity.ok(adminService.getAllUsers(q));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(List.of());
        }
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> setUserStatus(@PathVariable String userId, @RequestBody Map<String, String> body) {
        try {
            adminService.setUserStatus(userId, body.get("status"));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach auth-service"));
        }
    }

    // Extended 2026-07-23 for pharmacist provisioning: pharmacyId/
    // pharmacyName are optional body fields (only sent by the frontend when
    // promoting to PHARMACIST via its pharmacy picker) — when present, the
    // pharmacy assignment is synced alongside the role change in one call
    // instead of needing a second endpoint round trip. pharmacyRole
    // (OWNER/MANAGER, added same day) is optional on top of that — only
    // meaningful alongside pharmacyId, so it's ignored unless pharmacyId is
    // also present.
    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<?> setUserRole(@PathVariable String userId, @RequestBody Map<String, String> body) {
        try {
            String pharmacyId = body.get("pharmacyId");
            String pharmacyName = body.get("pharmacyName");
            String pharmacyRole = body.get("pharmacyRole");
            if (pharmacyId != null && pharmacyRole != null) {
                adminService.setUserRoleWithPharmacy(userId, body.get("role"), pharmacyId, pharmacyName, pharmacyRole);
            } else if (pharmacyId != null) {
                adminService.setUserRoleWithPharmacy(userId, body.get("role"), pharmacyId, pharmacyName);
            } else {
                adminService.setUserRole(userId, body.get("role"));
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach auth-service"));
        }
    }

    // ── Pharmacies ───────────────────────────────────────────────────────

    @GetMapping("/pharmacies")
    public ResponseEntity<List<Map<String, Object>>> getAllPharmacies() {
        try {
            return ResponseEntity.ok(adminService.getAllPharmacies());
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(List.of());
        }
    }

    @PostMapping("/pharmacies")
    public ResponseEntity<?> createPharmacy(@RequestBody Map<String, Object> pharmacy) {
        try {
            return ResponseEntity.ok(adminService.createPharmacy(pharmacy));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach pharmacy-service"));
        }
    }

    @PatchMapping("/pharmacies/{pharmacyId}/verify")
    public ResponseEntity<?> setPharmacyVerified(@PathVariable String pharmacyId, @RequestBody Map<String, Boolean> body) {
        try {
            Boolean verified = body.get("verified");
            adminService.setPharmacyVerified(pharmacyId, Boolean.TRUE.equals(verified));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach pharmacy-service"));
        }
    }

    // ── Orders ───────────────────────────────────────────────────────────

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getAllOrders() {
        try {
            return ResponseEntity.ok(adminService.getAllOrders());
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(List.of());
        }
    }

    // ── Community moderation ─────────────────────────────────────────────

    @GetMapping("/community/reports")
    public ResponseEntity<List<Map<String, Object>>> getReportedPosts() {
        try {
            return ResponseEntity.ok(adminService.getReportedPosts());
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(List.of());
        }
    }

    @DeleteMapping("/community/posts/{postId}")
    public ResponseEntity<?> removePost(@PathVariable String postId) {
        try {
            adminService.removePost(postId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach community-service"));
        }
    }

    @DeleteMapping("/community/comments/{commentId}")
    public ResponseEntity<?> removeComment(@PathVariable String commentId) {
        try {
            adminService.removeComment(commentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RestClientException e) {
            return ResponseEntity.status(502).body(Map.of("message", "Could not reach community-service"));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Admin service is running!");
    }
}
