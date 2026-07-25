package com.pharmalink.auth_service.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reads the identity api-gateway's JwtAuthFilter forwards
 * (X-User-Id/X-User-Role) — same pattern as every other service's
 * AuthContext. First use in auth-service: every endpoint before the
 * two-factor toggle (register/login/forgot/reset-password) is either how
 * you *get* a token or explicitly can't require one yet, so none of them
 * needed to know "who is the currently authenticated caller." The 2FA
 * enable/disable toggle is the first auth-service endpoint that does.
 *
 * Only works when the caller genuinely came through api-gateway AND the
 * path isn't in JwtAuthFilter's open-path list — see that class's javadoc
 * for why /api/auth/2fa (the toggle) was deliberately carved out of the
 * previously-blanket-open /api/auth/** while /api/auth/2fa/verify and
 * /api/auth/2fa/resend stayed open (they're part of the unauthenticated
 * login flow itself, before a token exists).
 */
public final class AuthContext {

    private AuthContext() {}

    public static String currentUserId(HttpServletRequest request) {
        return request.getHeader("X-User-Id");
    }

    public static String currentRole(HttpServletRequest request) {
        return request.getHeader("X-User-Role");
    }
}
