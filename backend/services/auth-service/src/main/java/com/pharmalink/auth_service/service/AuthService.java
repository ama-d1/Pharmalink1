package com.pharmalink.auth_service.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pharmalink.auth_service.client.ProfileClient;
import com.pharmalink.auth_service.dto.AuthResponse;
import com.pharmalink.auth_service.dto.LoginRequest;
import com.pharmalink.auth_service.dto.RegisterRequest;
import com.pharmalink.auth_service.model.User;
import com.pharmalink.auth_service.repository.UserRepository;
import com.pharmalink.auth_service.security.JwtService;

@Service
public class AuthService {

    private static final long RESET_TOKEN_VALID_MINUTES = 30;

    // Coming-soon roadmap item #9: how long an emailed 2FA code stays valid.
    // Deliberately short — these are 6-digit numeric codes (10^6 possible
    // values), so a short window matters more than it would for a UUID
    // reset token. NOTE: there's no attempt-rate-limiting on
    // verifyTwoFactorCode() yet (same gap as everywhere else auth-related in
    // this codebase, e.g. login itself has no lockout) — flagged here rather
    // than silently shipped as if it were hardened.
    private static final long TWO_FACTOR_CODE_VALID_MINUTES = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    // Phase 2 (MICROSERVICES_PLAN.md §6 step 8): matches
    // frontend/utils/validation.ts's ALLOWED_EMAIL_DOMAINS exactly — that
    // list was frontend-only until now, meaning anyone calling the API
    // directly bypassed it. Only applied at register() (self-registration
    // is always PATIENT, per this class's existing comment below) —
    // deliberately NOT applied to pharmacist/admin provisioning (whatever
    // that ends up being), since the plan doc already flagged that this
    // restriction would wrongly block a work email for those roles.
    private static final Set<String> ALLOWED_EMAIL_DOMAINS = Set.of(
            "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
            "live.com", "msn.com", "aol.com", "protonmail.com", "proton.me"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final ProfileClient profileClient;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        EmailService emailService,
                        ProfileClient profileClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.profileClient = profileClient;
    }

    // Public self-registration is always PATIENT — matches monolith behavior.
    // PHARMACIST/ADMIN accounts are provisioned another way, not through this
    // endpoint (see BACKEND_TODO.md's note on email-domain restriction risk
    // for pharmacist/admin self-registration).
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        String domain = request.getEmail().substring(request.getEmail().lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EMAIL_DOMAINS.contains(domain)) {
            throw new IllegalArgumentException(
                    "Please use an email from a supported provider (Gmail, Yahoo, Outlook, iCloud, etc.)");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.PATIENT);
        user.setEnabled(true);

        userRepository.save(user);

        // Not best-effort on purpose — see ProfileClient javadoc. If this
        // throws, the whole registration fails (RuntimeException bubbles up
        // to the controller's catch block as a normal 400), rather than
        // leaving a User row with nowhere to store a display name.
        profileClient.createProfile(user.getId(), request.getFullName(), request.getPhoneNumber(),
                user.getRole().name(), user.getEmail());

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthResponse(token, user.getId(), request.getFullName(), user.getEmail(),
                user.getRole().name(), "Registration successful");
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }

        if (!user.isEnabled()) {
            throw new IllegalStateException("Account is disabled");
        }

        // Coming-soon roadmap item #9: password was correct, but this
        // account has 2FA turned on — don't issue a token yet. Email a code
        // and tell the frontend to prompt for it instead.
        if (user.isTwoFactorEnabled()) {
            issueAndSendTwoFactorCode(user);
            AuthResponse response = new AuthResponse(null, user.getId(), null, user.getEmail(), null,
                    "Verification code sent to your email");
            response.setRequires2FA(true);
            return response;
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        // Best-effort — see ProfileClient javadoc. fullName may be null in
        // the response if user-profile-service is unreachable; login itself
        // still succeeds.
        String fullName = profileClient.fetchFullName(user.getId());

        return new AuthResponse(token, user.getId(), fullName, user.getEmail(),
                user.getRole().name(), "Login successful");
    }

    // ── Two-factor authentication (coming-soon roadmap item #9) ─────────────

    private void issueAndSendTwoFactorCode(User user) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        user.setTwoFactorCode(code);
        user.setTwoFactorCodeExpiry(LocalDateTime.now().plusMinutes(TWO_FACTOR_CODE_VALID_MINUTES));
        userRepository.save(user);
        emailService.sendTwoFactorCode(user.getEmail(), code);
    }

    /**
     * Completes the login flow started by login() above when 2FA is
     * enabled. Single-use: the code is cleared as soon as it's verified, so
     * a replayed request with the same code fails the second time.
     */
    public AuthResponse verifyTwoFactorCode(String userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getTwoFactorCode() == null || !user.getTwoFactorCode().equals(code)) {
            throw new IllegalArgumentException("Invalid verification code");
        }
        if (user.getTwoFactorCodeExpiry() == null || user.getTwoFactorCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Verification code expired");
        }

        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpiry(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        String fullName = profileClient.fetchFullName(user.getId());

        return new AuthResponse(token, user.getId(), fullName, user.getEmail(),
                user.getRole().name(), "Login successful");
    }

    /**
     * Re-sends a fresh code (invalidating whatever was previously issued) —
     * for when the first email is slow to arrive or the 10-minute window
     * lapses. Doesn't check whether the account exists via a thrown
     * exception the controller could leak — see controller javadoc for the
     * enumeration-risk reasoning, same as forgotPassword().
     */
    public void resendTwoFactorCode(String userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (user.isTwoFactorEnabled()) {
                issueAndSendTwoFactorCode(user);
            }
        });
    }

    /**
     * userId comes from the caller's own JWT (via AuthContext in the
     * controller), never from the request body — this is a security
     * setting, not something one user should be able to flip for another.
     */
    public boolean setTwoFactorEnabled(String userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setTwoFactorEnabled(enabled);
        if (!enabled) {
            // Clear any outstanding code too — no reason to leave a live
            // code around for a feature that was just turned off.
            user.setTwoFactorCode(null);
            user.setTwoFactorCodeExpiry(null);
        }
        userRepository.save(user);
        return user.isTwoFactorEnabled();
    }

    public boolean isTwoFactorEnabled(String userId) {
        return userRepository.findById(userId)
                .map(User::isTwoFactorEnabled)
                .orElse(false);
    }

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email does not exist"));

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(RESET_TOKEN_VALID_MINUTES));
        userRepository.save(user);

        emailService.sendResetEmail(email, token);
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Token expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    // ── Admin-service support (MICROSERVICES_PLAN.md §6 step 7c) ───────────
    // These three methods back /internal/auth/users/** — deliberately NOT
    // under /api/auth/**, because there's no gateway route for /internal/**
    // at all (service-to-service only, unreachable from outside the private
    // Docker network — see api-gateway's application.yaml). A user-listing +
    // role/status-mutation endpoint reachable without going through that
    // boundary would be a straightforward privilege-escalation hole (anyone
    // could PATCH their own role to ADMIN). Only admin-service calls these.
    // (NOTE: as of coming-soon roadmap item #9, /api/auth/** itself is no
    // longer a blanket-open prefix either — only specific sub-paths are, see
    // JwtAuthFilter — but that's a separate reason from why these three live
    // under /internal/** rather than /api/auth/**.)

    public java.util.List<java.util.Map<String, Object>> listAllUsers() {
        return userRepository.findAll().stream().map(u -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("role", u.getRole().name());
            m.put("enabled", u.isEnabled());
            m.put("createdAt", u.getCreatedAt());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    public void setUserEnabled(String userId, boolean enabled) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEnabled(enabled);
        userRepository.save(user);
    }

    public User setUserRole(String userId, String role) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        User.Role parsedRole;
        try {
            parsedRole = User.Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Unknown role: " + role);
        }
        user.setRole(parsedRole);
        return userRepository.save(user);
    }
}
