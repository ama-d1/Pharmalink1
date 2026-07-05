package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.ProfileUpdateRequest;
import com.PHARMALINK1.server.model.Appointment;
import com.PHARMALINK1.server.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(userId, request));
    }

    @PutMapping("/{userId}/health")
    public ResponseEntity<Map<String, Object>> updateHealth(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(userId, request));
    }

    @GetMapping("/{userId}/appointments")
    public ResponseEntity<List<Appointment>> getAppointments(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getAppointments(userId));
    }

    @PostMapping("/{userId}/appointments")
    public ResponseEntity<Appointment> bookAppointment(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(profileService.bookAppointment(userId, body));
    }

    @PostMapping("/{userId}/dose-log")
    public ResponseEntity<Map<String, Object>> logDose(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(profileService.logDose(userId, body.get("medicationId")));
    }

    @GetMapping("/{userId}/adherence-report")
    public ResponseEntity<Map<String, Object>> adherenceReport(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getAdherenceReport(userId));
    }

    @PutMapping("/{userId}/settings")
    public ResponseEntity<Map<String, Object>> updateSettings(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(userId, request));
    }
}
