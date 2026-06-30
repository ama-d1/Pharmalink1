package com.pharmalink.medication_service.controller;

import com.pharmalink.medication_service.dto.MedicationRequest;
import com.pharmalink.medication_service.dto.MedicationResponse;
import com.pharmalink.medication_service.service.MedicationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@CrossOrigin(origins = "*")
public class MedicationController {

    @Autowired
    private MedicationService medicationService;

    @PostMapping("/add")
    public ResponseEntity<MedicationResponse> addMedication(@Valid @RequestBody MedicationRequest request) {
        try {
            MedicationResponse response = medicationService.addMedication(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MedicationResponse>> getUserMedications(@PathVariable String userId) {
        try {
            List<MedicationResponse> medications = medicationService.getUserMedications(userId);
            return ResponseEntity.ok(medications);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<List<MedicationResponse>> getActiveMedications(@PathVariable String userId) {
        try {
            List<MedicationResponse> medications = medicationService.getActiveMedications(userId);
            return ResponseEntity.ok(medications);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{medicationId}/dose-status")
    public ResponseEntity<MedicationResponse> updateDoseStatus(
            @PathVariable String medicationId,
            @RequestParam String status) {
        try {
            MedicationResponse response = medicationService.updateDoseStatus(medicationId, status);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MedicationResponse(e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Long> countActiveMedications(@PathVariable String userId) {
        try {
            long count = medicationService.countActiveMedications(userId);
            return ResponseEntity.ok(count);
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