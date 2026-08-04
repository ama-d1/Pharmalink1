package com.pharmalink.admin_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Calls auth-service's /internal/auth/** — the authoritative source for
 * email/role/enabled/createdAt. Not best-effort: admin actions (disabling a
 * user, changing a role) need to actually succeed or fail visibly, not
 * silently no-op.
 */
@Component
public class AuthClient {

    private final RestClient restClient;

    public AuthClient(@Value("${services.auth.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listAllUsers() {
        return restClient.get()
                .uri("/internal/auth/users")
                .retrieve()
                .body(List.class);
    }

    public void setUserEnabled(String userId, boolean enabled) {
        restClient.patch()
                .uri("/internal/auth/users/{userId}/status", userId)
                .body(Map.of("enabled", enabled))
                .retrieve()
                .toBodilessEntity();
    }

    public void setUserRole(String userId, String role) {
        restClient.patch()
                .uri("/internal/auth/users/{userId}/role", userId)
                .body(Map.of("role", role))
                .retrieve()
                .toBodilessEntity();
    }
}
