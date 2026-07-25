package com.pharmalink.notification_service.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reads the identity api-gateway's JwtAuthFilter forwards
 * (X-User-Id/X-User-Role) and provides the ownership check used across this
 * service's controllers. Phase 2 hardening (MICROSERVICES_PLAN.md §6 step
 * 8) — previously every endpoint trusted whatever userId was passed in a
 * path/body param with no cross-check against who was actually making the
 * request.
 *
 * Only works when the caller genuinely came through api-gateway (or another
 * service that forwarded its own inbound headers via
 * ForwardedHeadersInterceptor). Hitting this service directly on its own
 * port bypasses the gateway and carries none of these headers —
 * isOwnerOrAdmin() then always returns false for a non-null ownerId, which
 * is correct default-deny behavior, but worth knowing when testing a
 * service standalone.
 */
public final class AuthContext {

    private AuthContext() {}

    public static String currentUserId(HttpServletRequest request) {
        return request.getHeader("X-User-Id");
    }

    public static String currentRole(HttpServletRequest request) {
        return request.getHeader("X-User-Role");
    }

    public static boolean isAdmin(HttpServletRequest request) {
        return "ADMIN".equals(currentRole(request));
    }

    public static boolean isOwnerOrAdmin(HttpServletRequest request, String ownerId) {
        if (isAdmin(request)) return true;
        String callerId = currentUserId(request);
        return callerId != null && callerId.equals(ownerId);
    }
}
