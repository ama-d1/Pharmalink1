package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.MedicationRequest;
import com.PHARMALINK1.server.dto.MedicationResponse;
import com.PHARMALINK1.server.service.MedicationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@CrossOrigin(origins = "*")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @PostMapping("/add")
    public ResponseEntity<MedicationResponse> addMedication(@Valid @RequestBody MedicationRequest request) {
        try {
            return ResponseEntity.ok(medicationService.addMedication(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MedicationResponse>> getUserMedications(@PathVariable String userId) {
        try {
            return ResponseEntity.ok(medicationService.getUserMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<List<MedicationResponse>> getActiveMedications(@PathVariable String userId) {
        try {
            return ResponseEntity.ok(medicationService.getActiveMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{medicationId}/dose-status")
    public ResponseEntity<MedicationResponse> updateDoseStatus(
            @PathVariable String medicationId,
            @RequestParam String status) {
        try {
            return ResponseEntity.ok(medicationService.updateDoseStatus(medicationId, status));
        } catch (IllegalArgumentException e) {
            // Invalid enum value for status
            return ResponseEntity.badRequest()
                .body(new MedicationResponse("Invalid status value: " + status));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Long> countActiveMedications(@PathVariable String userId) {
        try {
            return ResponseEntity.ok(medicationService.countActiveMedications(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{medicationId}")
    public ResponseEntity<String> deleteMedication(@PathVariable String medicationId) {
        try {
            medicationService.deleteMedication(medicationId);
            return ResponseEntity.ok("Medication deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Medication service is running!");
    }
}
