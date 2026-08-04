package com.pharmalink.medication_service.controller;

import com.pharmalink.medication_service.dto.DoseLogRequest;
import com.pharmalink.medication_service.dto.MedicationRequest;
import com.pharmalink.medication_service.dto.MedicationResponse;
import com.pharmalink.medication_service.dto.MedicationUpdateRequest;
import com.pharmalink.medication_service.security.AuthContext;
import com.pharmalink.medication_service.service.MedicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Phase 2 (step 8): every endpoint keyed by a userId, medicationId, or
// medicationGroupId now checks ownership via AuthContext — either directly
// (userId in the path/body must match the caller) or by resolving the
// resource's owner first (medicationId/medicationGroupId aren't
// self-describing, so MedicationService now exposes
// getMedicationOwnerId()/getMedicationGroupOwnerId() for this). A null
// owner (resource not found) returns 404, not 403 — those are different
// failures and conflating them would leak "this id doesn't exist" info
// through timing/behavior differences anyway, so no security benefit to
// hiding the distinction.
@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @PostMapping("/add")
    public ResponseEntity<?> addMedication(
            @Valid @RequestBody MedicationRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, request.getUserId())) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.addMedication(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserMedications(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.getUserMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<?> getActiveMedications(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.getActiveMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/group/{medicationGroupId}")
    public ResponseEntity<?> getMedicationsInGroup(@PathVariable String medicationGroupId, HttpServletRequest request) {
        String ownerId = medicationService.getMedicationGroupOwnerId(medicationGroupId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) return forbidden();
        return ResponseEntity.ok(medicationService.getMedicationsInGroup(medicationGroupId));
    }

    // New — closes BACKEND_TODO.md's flagged gap: previously no way to edit
    // a medication at all; the frontend faked it via delete+recreate.
    @PutMapping("/{medicationId}")
    public ResponseEntity<?> updateMedication(
            @PathVariable String medicationId,
            @RequestBody MedicationUpdateRequest request,
            HttpServletRequest httpRequest) {
        String ownerId = medicationService.getMedicationOwnerId(medicationId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.updateMedication(medicationId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    // New — edits every row sharing a medicationGroupId in one call (e.g.
    // both rows of a "twice daily" medication).
    @PutMapping("/group/{medicationGroupId}")
    public ResponseEntity<?> updateMedicationGroup(
            @PathVariable String medicationGroupId,
            @RequestBody MedicationUpdateRequest request,
            HttpServletRequest httpRequest) {
        String ownerId = medicationService.getMedicationGroupOwnerId(medicationGroupId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.updateMedicationGroup(medicationGroupId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{medicationId}/dose-status")
    public ResponseEntity<?> updateDoseStatus(
            @PathVariable String medicationId,
            @RequestParam String status,
            HttpServletRequest httpRequest) {
        String ownerId = medicationService.getMedicationOwnerId(medicationId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.updateDoseStatus(medicationId, status));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse("Invalid status value: " + status));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<?> countActiveMedications(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.countActiveMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{medicationId}")
    public ResponseEntity<?> deleteMedication(@PathVariable String medicationId, HttpServletRequest httpRequest) {
        String ownerId = medicationService.getMedicationOwnerId(medicationId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        try {
            medicationService.deleteMedication(medicationId);
            return ResponseEntity.ok("Medication deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // New — restores dose-logging (dropped during the user-profile-service
    // extraction step; DoseLog belongs here, not there). Called by
    // user-profile-service, which now forwards the original caller's
    // headers (ForwardedHeadersInterceptor) — so the ownership check here
    // works the same whether the frontend hits this directly or via that
    // internal hop.
    @PostMapping("/{medicationId}/dose-log")
    public ResponseEntity<?> logDose(
            @PathVariable String medicationId,
            @Valid @RequestBody DoseLogRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, request.getUserId())) return forbidden();
        try {
            return ResponseEntity.ok(medicationService.logDose(medicationId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // New — real per-dose history (BACKEND_TODO.md's flagged gap).
    @GetMapping("/{medicationId}/dose-history")
    public ResponseEntity<?> getDoseHistory(@PathVariable String medicationId, HttpServletRequest request) {
        String ownerId = medicationService.getMedicationOwnerId(medicationId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) return forbidden();
        return ResponseEntity.ok(medicationService.getDoseHistory(medicationId));
    }

    // New — used by user-profile-service's adherence-report endpoint.
    @GetMapping("/user/{userId}/dose-count")
    public ResponseEntity<?> getDoseCountForUser(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(medicationService.getDoseCountForUser(userId));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Medication service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
    }
}
