package com.pharmalink.admin_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Calls user-profile-service's /internal/profiles/directory (fullName/
 * phoneNumber) and the role-sync endpoint. The directory call is
 * best-effort — if it fails, the admin user list just shows auth-service's
 * data with missing names rather than failing the whole screen. The
 * role-sync call is ALSO best-effort even though it's a write: auth-service
 * is the authoritative source for role, so a failure here only means the
 * profile's denormalized copy stays stale a bit longer (an already-accepted
 * risk per Profile's own class javadoc) — it must never roll back or block
 * the authoritative role change that already succeeded.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private final RestClient restClient;

    public ProfileClient(@Value("${services.user-profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getDirectory() {
        try {
            return restClient.get()
                    .uri("/internal/profiles/directory")
                    .retrieve()
                    .body(List.class);
        } catch (RestClientException e) {
            log.warn("Could not fetch profile directory for admin user list: {}", e.getMessage());
            return List.of();
        }
    }

    public void syncRole(String userId, String role) {
        try {
            restClient.patch()
                    .uri("/internal/profiles/{userId}/role", userId)
                    .body(Map.of("role", role))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not sync denormalized role for user {}: {}", userId, e.getMessage());
        }
    }

    // Added 2026-07-23 for pharmacist provisioning — same best-effort
    // pattern as syncRole above (auth-service/the role change itself is
    // authoritative; this profile-service write is a nice-to-have copy).
    public void syncPharmacy(String userId, String pharmacyId, String pharmacyName) {
        try {
            restClient.patch()
                    .uri("/internal/profiles/{userId}/pharmacy", userId)
                    .body(Map.of("pharmacyId", pharmacyId, "pharmacyName", pharmacyName))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not sync pharmacy assignment for user {}: {}", userId, e.getMessage());
        }
    }

    // Added 2026-07-23 — same pattern, extended to also carry the
    // OWNER/MANAGER tier (a pharmacy can now have multiple staff accounts).
    public void syncPharmacy(String userId, String pharmacyId, String pharmacyName, String pharmacyRole) {
        try {
            restClient.patch()
                    .uri("/internal/profiles/{userId}/pharmacy", userId)
                    .body(Map.of("pharmacyId", pharmacyId, "pharmacyName", pharmacyName, "pharmacyRole", pharmacyRole))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not sync pharmacy assignment for user {}: {}", userId, e.getMessage());
        }
    }
}
