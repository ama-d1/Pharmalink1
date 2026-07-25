package com.pharmalink.pharmacy_service.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reads the identity api-gateway's JwtAuthFilter forwards
 * (X-User-Id/X-User-Role) and provides the ownership check used for review
 * mutations — same pattern as every other service's AuthContext (see e.g.
 * community-service's, which this was copied from verbatim).
 *
 * Only works when the caller genuinely came through api-gateway. Hitting
 * this service directly on its own port bypasses the gateway and carries
 * none of these headers — isOwnerOrAdmin() then always returns false for a
 * non-null ownerId, which is correct default-deny behavior.
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
