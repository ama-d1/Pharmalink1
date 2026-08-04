package com.pharmalink.user_profile_service.controller;

import com.pharmalink.user_profile_service.dto.CreateProfileRequest;
import com.pharmalink.user_profile_service.model.Profile;
import com.pharmalink.user_profile_service.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Service-to-service only — called by auth-service right after registration.
 * Not meant to be reachable from the frontend/gateway. It's permitAll for
 * now (matching every other route's Phase 1 posture — see SecurityConfig),
 * which is a real gap: on a real network, this needs to be restricted to
 * internal traffic only (Docker network isolation once the gateway exists,
 * or mutual-TLS/service auth). Tracked as a Phase 2 hardening item, called
 * out explicitly here since it's easy to forget precisely because it "just
 * works" during local dev.
 */
@RestController
@RequestMapping("/internal/profiles")
public class InternalProfileController {

    private final ProfileService profileService;

    public InternalProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping
    public ResponseEntity<Profile> createProfile(@Valid @RequestBody CreateProfileRequest request) {
        return ResponseEntity.ok(profileService.createProfile(request));
    }

    // Added during chat-service extraction (step 5b) — batch name lookup so
    // chat-service can resolve conversation participant display names in
    // one call. GET /internal/profiles/names?ids=id1,id2,id3
    @GetMapping("/names")
    public ResponseEntity<Map<String, String>> resolveNames(@RequestParam List<String> ids) {
        return ResponseEntity.ok(profileService.resolveNames(ids));
    }

    // Added 2026-07-24 — community-service uses this to badge pharmacist
    // authored posts as "Health Professional" in the feed. Same batch shape
    // as /names (userId -> value) so ProfileClient can reuse one pattern.
    @GetMapping("/roles")
    public ResponseEntity<Map<String, String>> resolveRoles(@RequestParam List<String> ids) {
        return ResponseEntity.ok(profileService.resolveRoles(ids));
    }

    // Added for admin-service (step 7c) — lightweight display-fields-only
    // listing, joined by admin-service against auth-service's authoritative
    // user list by userId.
    @GetMapping("/directory")
    public ResponseEntity<List<Map<String, Object>>> getDirectory() {
        return ResponseEntity.ok(profileService.getDirectory());
    }

    // Added for admin-service (step 7c) — keeps the denormalized role copy
    // in sync after an admin role change. See ProfileService javadoc.
    @PatchMapping("/{userId}/role")
    public ResponseEntity<?> updateRole(@PathVariable String userId, @RequestBody Map<String, String> body) {
        try {
            profileService.updateDenormalizedRole(userId, body.get("role"));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    // Added 2026-07-23 for pharmacist provisioning — same best-effort,
    // called-right-after-the-authoritative-role-change pattern as /role
    // above. See ProfileService.updateDenormalizedPharmacy's javadoc.
    @PatchMapping("/{userId}/pharmacy")
    public ResponseEntity<?> updatePharmacy(@PathVariable String userId, @RequestBody Map<String, String> body) {
        try {
            // pharmacyRole (OWNER/MANAGER, added 2026-07-23) is optional in
            // the body for backward compat — falls back to the 3-arg
            // overload (leaves pharmacyRole untouched) if omitted.
            String pharmacyRole = body.get("pharmacyRole");
            if (pharmacyRole != null) {
                profileService.updateDenormalizedPharmacy(userId, body.get("pharmacyId"), body.get("pharmacyName"), pharmacyRole);
            } else {
                profileService.updateDenormalizedPharmacy(userId, body.get("pharmacyId"), body.get("pharmacyName"));
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    // Coming-soon roadmap item #3 (COMING_SOON_ROADMAP.md) — community-service
    // checks this before notifying a post's author about a new comment, so
    // the "Community Activity" settings toggle actually does something
    // rather than being a fake no-op switch.
    @GetMapping("/{userId}/community-alerts")
    public ResponseEntity<Map<String, Boolean>> getCommunityAlertsEnabled(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of("enabled", profileService.isCommunityAlertsEnabled(userId)));
    }

    // Coming-soon roadmap item #6 (COMING_SOON_ROADMAP.md) — notification-service
    // calls this to decide whether/where to email a user for an
    // ORDER_STATUS/APPOINTMENT_REMINDER notification. Empty body (200, {})
    // means "no profile, nothing to send" — see ProfileService.getEmailPreference().
    @GetMapping("/{userId}/email-preference")
    public ResponseEntity<Map<String, Object>> getEmailPreference(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getEmailPreference(userId));
    }

    // Added 2026-07-23 for pharmacy-service's stock/pricing endpoints — a
    // pharmacist can only write stock for THEIR OWN pharmacy, but the JWT
    // itself only carries userId/role/email (see api-gateway's
    // JwtAuthFilter), not pharmacyId. This lets pharmacy-service look up the
    // calling pharmacist's assigned pharmacyId to check that ownership,
    // rather than trusting a pharmacyId the frontend/path param claims.
    @GetMapping("/{userId}/pharmacy")
    public ResponseEntity<Map<String, Object>> getPharmacy(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getPharmacyAssignment(userId));
    }
}
