package com.pharmalink.pharmacy_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Calls user-profile-service to resolve reviewer display names — same batch
 * endpoint and best-effort pattern as community-service's ProfileClient
 * (GET /internal/profiles/names?ids=...). Falls back to "Member" on a
 * resolution miss rather than failing the whole reviews list.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private static final ParameterizedTypeReference<Map<String, String>> NAMES_RESULT_TYPE =
        new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public ProfileClient(@Value("${services.user-profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public Map<String, String> resolveNames(List<String> userIds) {
        if (userIds.isEmpty()) return Map.of();
        try {
            Map<String, String> result = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/internal/profiles/names")
                            .queryParam("ids", userIds)
                            .build())
                    .retrieve()
                    .body(NAMES_RESULT_TYPE);
            return result != null ? result : Map.of();
        } catch (RestClientException e) {
            log.warn("Batch name resolution failed against user-profile-service: {}", e.getMessage());
            return Map.of();
        }
    }

    // Added 2026-07-23 for PharmacyStockController's ownership check — a
    // pharmacist may only write stock for the pharmacy they're actually
    // assigned to (per user-profile-service's Profile.pharmacyId, set during
    // admin-service's provisioning flow), not whatever pharmacyId the
    // request's path happens to claim.
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

    // Added 2026-07-24 for PayoutController's ownership check — bank-account
    // setup must be OWNER-only (not MANAGER), so callers need pharmacyRole
    // alongside pharmacyId. user-profile-service's ProfileService now
    // includes it in the same /internal/profiles/{userId}/pharmacy response
    // getPharmacyIdForUser above already calls.
    public record PharmacyAssignment(String pharmacyId, String pharmacyRole) {}

    public Optional<PharmacyAssignment> getPharmacyAssignment(String userId) {
        try {
            Map<String, Object> result = restClient.get()
                    .uri("/internal/profiles/{userId}/pharmacy", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (result == null) return Optional.empty();
            Object pharmacyId = result.get("pharmacyId");
            if (!(pharmacyId instanceof String s) || s.isBlank()) return Optional.empty();
            Object pharmacyRole = result.get("pharmacyRole");
            return Optional.of(new PharmacyAssignment(s, pharmacyRole instanceof String r ? r : null));
        } catch (RestClientException e) {
            log.warn("Could not resolve pharmacy assignment for user {}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }
}
