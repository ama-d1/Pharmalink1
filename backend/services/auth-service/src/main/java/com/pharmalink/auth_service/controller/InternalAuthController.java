package com.pharmalink.auth_service.controller;

import com.pharmalink.auth_service.model.User;
import com.pharmalink.auth_service.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Service-to-service only — backs admin-service's user management screen.
 * Deliberately NOT under /api/auth/**: that prefix is one of api-gateway's
 * open (unauthenticated) paths, so a user-listing + role/status-mutation
 * endpoint living there would be reachable by anyone with no token at all —
 * a straightforward privilege-escalation hole. No gateway route exists for
 * /internal/**, so this is unreachable from outside the private network,
 * same convention as user-profile-service's /internal/profiles/**.
 */
@RestController
@RequestMapping("/internal/auth")
public class InternalAuthController {

    private final AuthService authService;

    public InternalAuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listAllUsers() {
        return ResponseEntity.ok(authService.listAllUsers());
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> setStatus(@PathVariable String userId, @RequestBody Map<String, Boolean> body) {
        try {
            Boolean enabled = body.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "enabled is required"));
            }
            authService.setUserEnabled(userId, enabled);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<?> setRole(@PathVariable String userId, @RequestBody Map<String, String> body) {
        try {
            User updated = authService.setUserRole(userId, body.get("role"));
            return ResponseEntity.ok(Map.of("id", updated.getId(), "role", updated.getRole().name()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
