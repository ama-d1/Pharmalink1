package com.pharmalink.auth_service.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pharmalink.auth_service.client.GoogleTokenVerifier;
import com.pharmalink.auth_service.client.ProfileClient;
import com.pharmalink.auth_service.dto.AuthResponse;
import com.pharmalink.auth_service.dto.LoginRequest;
import com.pharmalink.auth_service.dto.RegisterRequest;
import com.pharmalink.auth_service.model.User;
import com.pharmalink.auth_service.model.VerificationChannel;
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

    // Auth redesign (2026-08-04): the sign-up verification code. 15 minutes
    // rather than 2FA's 10 — this one arrives while someone is mid-signup and
    // may need to go find the email in a spam folder, and unlike a 2FA code
    // it isn't guarding an already-authenticated password check.
    //
    // FOUR digits, not six, to match the redesigned screen's four circles.
    // That is 10,000 possibilities, and like verifyTwoFactorCode() below
    // there is no attempt limiting anywhere in this codebase yet — so a
    // determined attacker who knows a userId could brute-force it. Stated
    // rather than glossed over: rate limiting is the fix, and it is not
    // built here.
    private static final long VERIFICATION_CODE_VALID_MINUTES = 15;
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

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final SmsService smsService;
    private final ProfileClient profileClient;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final boolean logResetCode;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        EmailService emailService,
                        SmsService smsService,
                        ProfileClient profileClient,
                        GoogleTokenVerifier googleTokenVerifier,
                        @Value("${app.reset-password.log-code:false}") boolean logResetCode) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.smsService = smsService;
        this.profileClient = profileClient;
        this.googleTokenVerifier = googleTokenVerifier;
        this.logResetCode = logResetCode;
    }

    /**
     * Phone numbers are typed inconsistently — "+233 24 123 4567",
     * "024-123-4567", "0241234567" are all the same number to a human but
     * three different strings to a UNIQUE constraint and to findByPhoneNumber().
     * Stripping everything except digits and a leading "+" makes the stored
     * form stable, which is what makes phone usable as a login identifier at
     * all.
     *
     * Deliberately NOT full E.164 normalisation (no country-code inference):
     * that needs a library and a default region, and guessing the region
     * wrong would silently split one user's number into two accounts. What
     * this does guarantee is that the same digits typed with different
     * spacing resolve to the same user.
     */
    static String normalizePhone(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        boolean international = trimmed.startsWith("+");
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;
        return international ? "+" + digits : digits;
    }

    // Public self-registration is always PATIENT — matches monolith behavior.
    // PHARMACIST/ADMIN accounts are provisioned another way, not through this
    // endpoint (see BACKEND_TODO.md's note on email-domain restriction risk
    // for pharmacist/admin self-registration).
    public AuthResponse register(RegisterRequest request) {
        String fullName = request.resolveFullName();
        if (fullName.isEmpty()) {
            // resolveFullName() covers both the new first/last-name payload
            // and an old client's single fullName field, so this can only
            // trip when neither was sent. Bean Validation can't express that
            // "one of these" rule, hence the manual check.
            throw new IllegalArgumentException("Full name is required");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        String phone = normalizePhone(request.getPhoneNumber());
        if (phone == null) {
            throw new IllegalArgumentException("Phone number is required");
        }
        // Phone is a login identifier now, so a duplicate has to be rejected
        // up front with a readable message rather than surfacing as a
        // constraint-violation stack trace from the UNIQUE index.
        if (userRepository.existsByPhoneNumber(phone)) {
            throw new IllegalArgumentException("An account with this phone number already exists");
        }

        String domain = request.getEmail().substring(request.getEmail().lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EMAIL_DOMAINS.contains(domain)) {
            throw new IllegalArgumentException(
                    "Please use an email from a supported provider (Gmail, Yahoo, Outlook, iCloud, etc.)");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPhoneNumber(phone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.PATIENT);
        user.setEnabled(true);
        // Auth redesign: the account is created but cannot log in until the
        // emailed code is confirmed. `enabled` stays true — that column is
        // the admin's suspension switch, see User.emailVerified's javadoc.
        user.setEmailVerified(false);

        userRepository.save(user);

        // Not best-effort on purpose — see ProfileClient javadoc. If this
        // throws, the whole registration fails (RuntimeException bubbles up
        // to the controller's catch block as a normal 400), rather than
        // leaving a User row with nowhere to store a display name.
        profileClient.createProfile(user.getId(), fullName, phone,
                user.getRole().name(), user.getEmail(),
                request.resolveFirstName(), request.resolveLastName(), request.getDateOfBirth());

        // No token here any more. The response carries the userId so the app
        // can drive the verification screen, and nothing else that would be
        // useful to an attacker who guessed an email.
        //
        // SMS by default: the form just collected a phone number, and a text
        // arrives faster than an email for most users here. Falls back to
        // email on its own if SMS is unconfigured or the send fails.
        VerificationChannel channel = issueAndSendVerificationCode(user, VerificationChannel.SMS);

        AuthResponse response = new AuthResponse(null, user.getId(), fullName, user.getEmail(),
                user.getRole().name(),
                channel == VerificationChannel.SMS
                        ? "Verification code sent to your phone"
                        : "Verification code sent to your email");
        response.setRequiresVerification(true);
        response.setVerificationChannel(channel.name());
        response.setVerificationTarget(maskDestination(channel, user));
        return response;
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.resolveIdentifier();
        if (identifier.isEmpty()) {
            throw new IllegalArgumentException("Email or phone number is required");
        }

        // Which lookup runs is decided by the shape of what was typed, not by
        // which tab the app was on — someone who types an email under the
        // "Phone Number" tab still gets logged in rather than a confusing
        // "user not found".
        User user = (request.isEmailIdentifier()
                ? userRepository.findByEmail(identifier)
                : userRepository.findByPhoneNumber(normalizePhone(identifier)))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // A Google-only account has no local password (password is nullable
        // since V3). Without this check, PasswordEncoder.matches() would be
        // handed a null hash — which throws, surfacing as an opaque 400
        // instead of telling the user how to actually get in.
        if (user.getPassword() == null) {
            throw new IllegalArgumentException("This account uses Google sign-in. Tap \"Continue with Google\" instead.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }

        if (!user.isEnabled()) {
            throw new IllegalStateException("Account is disabled");
        }

        // Auth redesign: signed up but never confirmed the emailed code —
        // most likely they closed the app on the verification screen. Re-send
        // a fresh code and route them back there rather than dead-ending on
        // an error they can't act on.
        if (!user.isEmailVerified()) {
            VerificationChannel channel = issueAndSendVerificationCode(user, VerificationChannel.SMS);
            AuthResponse response = new AuthResponse(null, user.getId(), null, user.getEmail(), null,
                    "Please confirm your account — we've sent you a new code");
            response.setRequiresVerification(true);
            response.setVerificationChannel(channel.name());
            response.setVerificationTarget(maskDestination(channel, user));
            return response;
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

    // ── Email verification at sign-up (auth redesign, 2026-08-04) ───────────

    /**
     * Issues a fresh code and sends it on the requested channel, returning
     * the channel it actually went out on.
     *
     * The code is persisted BEFORE any send, and no send failure propagates.
     * Both matter for register(): by the time this runs, the User and Profile
     * rows are already written, so letting an SMS or SMTP outage throw would
     * fail the request while leaving the account half-created — and the next
     * attempt would then hit "Email already exists" with no way to ever
     * verify. Swallowing instead leaves an account that can still be rescued
     * from the app: logging in re-sends a code, and so does Resend.
     *
     * SMS falls back to email automatically; email has nowhere to fall back
     * to. Failures are logged loudly precisely because they're invisible to
     * the user — "I never got the code" has to be diagnosable from here, same
     * reasoning as forgotPassword()'s logging.
     */
    private VerificationChannel issueAndSendVerificationCode(User user, VerificationChannel requested) {
        String code = String.format("%04d", RANDOM.nextInt(10_000));
        user.setVerificationCode(code);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(VERIFICATION_CODE_VALID_MINUTES));
        userRepository.save(user);

        if (requested == VerificationChannel.SMS && user.getPhoneNumber() != null && smsService.isConfigured()) {
            try {
                smsService.sendVerificationCode(user.getPhoneNumber(), code, VERIFICATION_CODE_VALID_MINUTES);
                return VerificationChannel.SMS;
            } catch (RuntimeException e) {
                log.error("Verification SMS FAILED for user {} — falling back to email: {}",
                        user.getId(), e.getMessage(), e);
            }
        }

        try {
            emailService.sendVerificationCode(user.getEmail(), code, VERIFICATION_CODE_VALID_MINUTES);
        } catch (RuntimeException e) {
            log.error("Verification email FAILED for {}: {}", user.getEmail(), e.getMessage(), e);
        }
        return VerificationChannel.EMAIL;
    }

    /**
     * A destination the user can recognise as theirs without the response
     * handing a full phone number or address to anyone who guessed a userId
     * (which is not a secret — it appears in responses and route params).
     */
    static String maskDestination(VerificationChannel channel, User user) {
        if (channel == VerificationChannel.SMS) {
            String phone = user.getPhoneNumber();
            if (phone == null || phone.length() <= 4) return "your phone";
            return "•••• " + phone.substring(phone.length() - 4);
        }

        String email = user.getEmail();
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) return "your email";
        // First character plus the domain — enough to tell "which of my
        // addresses is this" apart, not enough to learn the address.
        return email.charAt(0) + "•••" + email.substring(at);
    }

    /**
     * Confirms the code from register() (or from a login attempt on an
     * unverified account) and issues the token that register() withheld.
     * Single-use: the code is cleared on success, so a replay fails.
     */
    public AuthResponse verifyEmail(String userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // An already-verified account must NOT short-circuit to "success"
        // here, however convenient that would be for a double-tapped Confirm
        // button. This endpoint is unauthenticated and issues a token, so
        // skipping the code check for a verified user would mean anyone
        // holding a userId (which is not a secret — it appears in responses
        // and route params) could mint a session for that account with a
        // garbage code. Telling them to log in instead costs one extra step
        // in a rare case and closes an account-takeover hole.
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("This account is already verified — please log in.");
        }

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new IllegalArgumentException("Invalid verification code");
        }
        if (user.getVerificationCodeExpiry() == null
                || user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Verification code expired");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        if (!user.isEnabled()) {
            throw new IllegalStateException("Account is disabled");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        String fullName = profileClient.fetchFullName(user.getId());

        return new AuthResponse(token, user.getId(), fullName, user.getEmail(),
                user.getRole().name(), "Account verified");
    }

    /**
     * Fresh code on the requested channel, invalidating the previous one.
     * This is what backs both "Resend" and "Send to my email instead" on the
     * verification screen.
     *
     * Returns nothing, and the controller answers generically, whether or not
     * the account exists or is already verified — same enumeration-avoidance
     * reasoning as forgotPassword() and resendTwoFactorCode(). The app doesn't
     * need a channel back: it already knows which one it asked for.
     */
    public void resendVerificationCode(String userId, VerificationChannel channel) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!user.isEmailVerified()) {
                issueAndSendVerificationCode(user, channel);
            }
        });
    }

    // ── Google sign-in (auth redesign, 2026-08-04) ─────────────────────────

    /**
     * Signs in with a Google ID token, creating the account on first use.
     * The token is verified with Google before anything in it is trusted —
     * see GoogleTokenVerifier.
     *
     * Three cases, in order:
     *   1. googleId already linked → straight login.
     *   2. email matches a password account → link Google to it. Safe
     *      specifically because the verifier rejects tokens whose
     *      email_verified is false, so Google has confirmed ownership of that
     *      address; without that check this branch would be an account
     *      takeover via an unverified alias.
     *   3. neither → new PATIENT account, no password, already verified
     *      (Google vouched for the address, so re-emailing our own code would
     *      be pointless friction).
     */
    public AuthResponse loginWithGoogle(String idToken) {
        GoogleTokenVerifier.GoogleIdentity identity = googleTokenVerifier.verify(idToken);

        User user = userRepository.findByGoogleId(identity.subject())
                .or(() -> userRepository.findByEmail(identity.email()))
                .orElse(null);

        String fullName = null;

        if (user == null) {
            user = new User();
            user.setEmail(identity.email());
            user.setGoogleId(identity.subject());
            user.setRole(User.Role.PATIENT);
            user.setEnabled(true);
            user.setEmailVerified(true);
            // No password and no phone — both nullable since V3. The user can
            // add a phone number later from the profile screen; requiring it
            // here would defeat the point of one-tap sign-in.
            userRepository.save(user);

            fullName = composeName(identity.givenName(), identity.familyName(), identity.email());

            // Same non-best-effort contract as register() — a user with no
            // profile row is a broken account.
            profileClient.createProfile(user.getId(), fullName, null,
                    user.getRole().name(), user.getEmail(),
                    identity.givenName(), identity.familyName(), null);
        } else {
            if (!user.isEnabled()) {
                throw new IllegalStateException("Account is disabled");
            }
            boolean dirty = false;
            if (user.getGoogleId() == null) {
                user.setGoogleId(identity.subject());
                dirty = true;
            }
            if (!user.isEmailVerified()) {
                // Google has confirmed this address, so a pending code from
                // our own flow is moot — clear it rather than leaving a live
                // code lying around.
                user.setEmailVerified(true);
                user.setVerificationCode(null);
                user.setVerificationCodeExpiry(null);
                dirty = true;
            }
            if (dirty) userRepository.save(user);
            fullName = profileClient.fetchFullName(user.getId());
        }

        // 2FA is deliberately NOT re-challenged here. Google has already
        // performed a full authentication (including whatever second factor
        // the user has on their Google account), so emailing our own code on
        // top of it adds friction without adding a factor.
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthResponse(token, user.getId(), fullName, user.getEmail(),
                user.getRole().name(), "Login successful");
    }

    private static String composeName(String givenName, String familyName, String email) {
        String first = givenName == null ? "" : givenName.trim();
        String last = familyName == null ? "" : familyName.trim();
        String composed = (first + " " + last).trim();
        if (!composed.isEmpty()) return composed;
        // Google can omit both name claims depending on the granted scopes.
        // The local part of the address is a poor display name but a far
        // better one than an empty string, which Profile.fullName rejects.
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
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

        // Local-development escape hatch, OFF unless LOG_RESET_CODE=true.
        //
        // Password reset is unusable while SMTP is misconfigured — and there
        // is no other way to obtain the code, so the whole flow can't even be
        // tested. Logging it first means it's captured even when the send
        // below throws.
        //
        // Deliberately NOT on by default: anyone who can read these logs could
        // reset any account. Keep it false anywhere real.
        if (logResetCode) {
            log.warn("DEV ONLY (app.reset-password.log-code=true) — reset code for {}: {}", email, token);
        }

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
