package com.pharmalink.order_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Optional;

/**
 * Added 2026-07-23 for the pharmacist owner/manager dashboard's pharmacy-
 * scoped orders endpoint — same pattern as pharmacy-service's ProfileClient:
 * resolves the caller's own pharmacyId (per user-profile-service's
 * Profile.pharmacyId) so OrderController can check it matches the pharmacyId
 * in the request path before returning that pharmacy's order history/revenue.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private final RestClient restClient;

    public ProfileClient(@Value("${services.user-profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public Optional<String> getPharmacyIdForUser(String userId) {
        try {
            Map<String, Object> result = restClient.get()
                    .uri("/internal/profiles/{userId}/pharmacy", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (result == null) return Optional.empty();
            Object pharmacyId = result.get("pharmacyId");
            return pharmacyId instanceof String s && !s.isBlank() ? Optional.of(s) : Optional.empty();
        } catch (RestClientException e) {
            log.warn("Could not resolve pharmacy assignment for user {}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }
}
