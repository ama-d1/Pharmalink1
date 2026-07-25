package com.pharmalink.chat_service.security;

import java.security.Principal;

/**
 * Attached to the STOMP session by {@link StompAuthChannelInterceptor} after
 * a successful CONNECT-frame JWT validation. getName() returns the userId
 * (not the email) so downstream code (SUBSCRIBE authorization,
 * ChatService.isParticipant()) can compare it directly against
 * Conversation.patientId/pharmacistId without an extra lookup.
 */
public class StompPrincipal implements Principal {

    private final String userId;
    private final String role;
    private final String email;

    public StompPrincipal(String userId, String role, String email) {
        this.userId = userId;
        this.role = role;
        this.email = email;
    }

    @Override
    public String getName() {
        return userId;
    }

    public String getUserId() {
        return userId;
    }

    public String getRole() {
        return role;
    }

    public String getEmail() {
        return email;
    }

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }
}
