package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.AuthResponse;
import com.PHARMALINK1.server.dto.LoginRequest;
import com.PHARMALINK1.server.dto.RegisterRequest;
import com.PHARMALINK1.server.dto.ResetPasswordRequest;
import com.PHARMALINK1.server.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
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
     * Triggers a password-reset email with a one-time token.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
            }
            authService.forgotPassword(email);
            return ResponseEntity.ok(Map.of("message", "Password reset email sent successfully"));
        } catch (RuntimeException e) {
            // Return 200 even on "email not found" to avoid user enumeration
            return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent"));
        }
    }

    /**
     * POST /api/auth/reset-password
     * Body: { "token": "...", "password": "newPassword" }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
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
}
