package com.pharmalink.auth_service.controller;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pharmalink.auth_service.dto.AuthResponse;
import com.pharmalink.auth_service.dto.LoginRequest;
import com.pharmalink.auth_service.dto.RegisterRequest;
import com.pharmalink.auth_service.dto.ResetPasswordRequest;
import com.pharmalink.auth_service.dto.TwoFactorVerifyRequest;
import com.pharmalink.auth_service.security.AuthContext;
import com.pharmalink.auth_service.service.AuthService;

// NOTE: kept at /api/auth (not /api/v1/auth) to match what the monolith and
// frontend currently expect. The old @CrossOrigin(origins = "*") wildcard
// carried over from the monolith is gone — CORS is now handled centrally by
// SecurityConfig's corsConfigurationSource() bean (Phase 2 hardening,
// MICROSERVICES_PLAN.md §6 step 8), restricted to local Expo dev origins.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, null, null, e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, null, null, e.getMessage()));
        }
    }

    /**
     * POST /api/auth/forgot-password
     * Body: { "email": "user@example.com" }
     * Always returns 200 with a generic message, even if the email doesn't
     * exist — prevents user enumeration (matches monolith behavior).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        try {
            authService.forgotPassword(email);
        } catch (RuntimeException e) {
            // Swallowed intentionally — see javadoc above.
        }
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getPassword());
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Auth service is running!");
    }

    // ── Two-factor authentication (coming-soon roadmap item #9) ─────────────
    // /2fa/verify and /2fa/resend are part of the unauthenticated login flow
    // (the frontend has no token yet at this point) — api-gateway's
    // JwtAuthFilter open-path list was narrowed from a blanket /api/auth/**
    // to name these two explicitly alongside register/login/forgot/reset,
    // specifically so /2fa (the enable/disable toggle, below) could become
    // a normal authenticated route instead of also being wide open.

    /**
     * POST /api/auth/2fa/verify
     * Body: { "userId": "...", "code": "123456" }
     * Completes a login that returned requires2FA=true.
     */
    @PostMapping("/2fa/verify")
    public ResponseEntity<AuthResponse> verifyTwoFactor(@Valid @RequestBody TwoFactorVerifyRequest request) {
        try {
            return ResponseEntity.ok(authService.verifyTwoFactorCode(request.getUserId(), request.getCode()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, null, null, e.getMessage()));
        }
    }

    /**
     * POST /api/auth/2fa/resend
     * Body: { "userId": "..." }
     * Always returns a generic 200 regardless of whether userId is real or
     * has 2FA enabled — same enumeration-avoidance reasoning as
     * forgotPassword() above (this is reachable pre-token, so it can't
     * confirm/deny account state in its response).
     */
    @PostMapping("/2fa/resend")
    public ResponseEntity<?> resendTwoFactor(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        if (userId != null && !userId.isBlank()) {
            authService.resendTwoFactorCode(userId);
        }
        return ResponseEntity.ok(Map.of("message", "If verification is required, a new code has been sent"));
    }

    /**
     * GET /api/auth/2fa
     * Authenticated (not in JwtAuthFilter's open-path list) — reads the
     * caller's own 2FA state for the Profile screen's toggle.
     */
    @GetMapping("/2fa")
    public ResponseEntity<?> getTwoFactorStatus(HttpServletRequest request) {
        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        return ResponseEntity.ok(Map.of("enabled", authService.isTwoFactorEnabled(userId)));
    }

    /**
     * PATCH /api/auth/2fa
     * Body: { "enabled": true|false }
     * Authenticated — userId comes from the caller's own JWT via
     * AuthContext, never from the request body (see AuthService javadoc).
     */
    @PatchMapping("/2fa")
    public ResponseEntity<?> setTwoFactorEnabled(@RequestBody Map<String, Boolean> body, HttpServletRequest request) {
        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "enabled is required"));
        }
        try {
            boolean result = authService.setTwoFactorEnabled(userId, enabled);
            return ResponseEntity.ok(Map.of("enabled", result));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }
}
