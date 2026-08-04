package com.pharmalink.user_profile_service.controller;

import com.pharmalink.user_profile_service.dto.BookAppointmentRequest;
import com.pharmalink.user_profile_service.dto.ProfileUpdateRequest;
import com.pharmalink.user_profile_service.dto.SaveLocationRequest;
import com.pharmalink.user_profile_service.security.AuthContext;
import com.pharmalink.user_profile_service.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// dose-log logging and the adherence-report endpoint were dropped when
// this controller was first built (medication-service didn't exist yet)
// and are restored below now that it does — see MICROSERVICES_PLAN.md §6.
//
// Phase 2 (step 8): every {userId}-keyed endpoint below now checks that the
// caller IS that user (or an admin) via AuthContext, using the X-User-Id/
// X-User-Role headers api-gateway's JwtAuthFilter forwards. Previously any
// caller could read/write anyone's profile by just changing the userId in
// the URL. /search stays open — it's an inherently cross-user directory
// lookup (pharmacist search), not a per-user resource.
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    // Added during chat-service extraction (step 5b) — replaces the
    // monolith's ChatController's direct use of UserRepository for
    // pharmacist search. Declared before /{userId} so Spring MVC resolves
    // the literal "/search" path first (same reasoning as /health below).
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam String role,
            @RequestParam(required = false) String pharmacyId,
            @RequestParam(required = false) String name) {
        List<Map<String, Object>> result = profileService.searchByRole(role, pharmacyId, name).stream()
                .map(p -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("userId", p.getUserId());
                    m.put("fullName", p.getFullName());
                    m.put("pharmacyId", p.getPharmacyId());
                    m.put("pharmacyName", p.getPharmacyName());
                    m.put("email", p.getEmail());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    // New — backs locationService.ts's searchLocations(query), which used to
    // call a nonexistent `${API.base}/locations/search` route (no
    // location-service existed, and this wasn't in the gateway's route
    // table — see MICROSERVICES_PLAN.md/BACKEND_TODO.md). Declared before
    // /{userId} for the same reason /search above is: Spring MVC prefers
    // the more specific literal two-segment path over the one-segment
    // {userId} variable, so there's no ambiguity, but ordering it here
    // keeps that intent obvious. Not owner-scoped — see ProfileService
    // javadoc on searchLocations for why.
    @GetMapping("/locations/search")
    public ResponseEntity<?> searchLocations(@RequestParam(required = false, defaultValue = "") String q) {
        return ResponseEntity.ok(profileService.searchLocations(q));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    // Added 2026-07-23 for the owner/manager dashboard's staff-list section
    // — restricted to admins or to a pharmacist who is themselves assigned
    // to this exact pharmacyId (so any staff member, owner or manager, can
    // see who else works there; nobody can browse a different pharmacy's
    // staff). Declared before /{userId} isn't actually required (3-segment
    // path vs 1-segment {userId}, no ambiguity) but kept near it for
    // readability since both deal with "who am I allowed to look up".
    @GetMapping("/pharmacy/{pharmacyId}/staff")
    public ResponseEntity<?> getPharmacyStaff(@PathVariable String pharmacyId, HttpServletRequest request) {
        if (!AuthContext.isAdmin(request)) {
            String callerId = AuthContext.currentUserId(request);
            if (callerId == null) return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
            Object callerPharmacyId = profileService.getPharmacyAssignment(callerId).get("pharmacyId");
            if (!pharmacyId.equals(callerPharmacyId)) return forbidden();
        }
        return ResponseEntity.ok(profileService.getPharmacyStaff(pharmacyId));
    }

    // FIXED — this whole controller (except logDose) had NO exception
    // handling at all: every other service in this codebase catches
    // RuntimeException per-endpoint and returns a 400 with the real
    // e.getMessage() (see e.g. medication-service's MedicationController,
    // delivery-service's DeliveryController). Here, any failure — including
    // the DateTimeParseException bookAppointment used to throw on a
    // malformed date/time before the frontend added its own validation —
    // fell straight through to Spring Boot's default /error handler, which
    // returns "message": "No message available" (server.error.include-message
    // defaults to "never"). That's why "Book Appointment"/"Edit Health Info"
    // failures looked like they were silently doing nothing useful even
    // after the frontend was fixed to surface backend error messages —
    // there was never a real message for it to surface. Wrapping these in
    // try/catch, matching every other controller's convention, is what
    // actually closes that gap.
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            return ResponseEntity.ok(profileService.updateProfile(userId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/health")
    public ResponseEntity<?> updateHealth(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            return ResponseEntity.ok(profileService.updateProfile(userId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/settings")
    public ResponseEntity<?> updateSettings(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            return ResponseEntity.ok(profileService.updateProfile(userId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/appointments")
    public ResponseEntity<?> getAppointments(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(profileService.getAppointments(userId));
    }

    @PostMapping("/{userId}/appointments")
    public ResponseEntity<?> bookAppointment(
            @PathVariable String userId,
            @RequestBody BookAppointmentRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            return ResponseEntity.ok(profileService.bookAppointment(userId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{userId}/dose-log")
    public ResponseEntity<?> logDose(
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            return ResponseEntity.ok(profileService.logDose(userId, body.get("medicationId")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/adherence-report")
    public ResponseEntity<?> adherenceReport(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(profileService.getAdherenceReport(userId));
    }

    // New — backs locationService.ts's getSavedLocations/saveLocation/
    // deleteLocation/setDefaultLocation, which used to call nonexistent
    // `${API.base}/users/{id}/locations/**` routes (same gap as
    // /locations/search above).
    @GetMapping("/{userId}/locations")
    public ResponseEntity<?> getSavedLocations(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(profileService.getSavedLocations(userId));
    }

    @PostMapping("/{userId}/locations")
    public ResponseEntity<?> saveLocation(
            @PathVariable String userId,
            @RequestBody SaveLocationRequest request,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        return ResponseEntity.ok(profileService.saveLocation(userId, request));
    }

    @DeleteMapping("/{userId}/locations/{locationId}")
    public ResponseEntity<?> deleteLocation(
            @PathVariable String userId,
            @PathVariable String locationId,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            profileService.deleteLocation(userId, locationId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{userId}/locations/{locationId}/default")
    public ResponseEntity<?> setDefaultLocation(
            @PathVariable String userId,
            @PathVariable String locationId,
            HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, userId)) return forbidden();
        try {
            profileService.setDefaultLocation(userId, locationId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("User profile service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
    }
}
