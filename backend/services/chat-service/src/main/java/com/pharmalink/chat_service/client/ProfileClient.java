package com.pharmalink.chat_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

/**
 * Calls user-profile-service for the two things chat-service needs but
 * doesn't own: pharmacist search (role + pharmacyId/name — role lives in
 * auth-service, pharmacyId/name in user-profile-service; user-profile-service
 * denormalizes role for exactly this) and participant display-name
 * resolution for conversation previews.
 *
 * Both best-effort: a failure degrades the feature (empty search results,
 * null participant names) rather than breaking chat entirely — messaging
 * itself doesn't depend on either of these calls succeeding.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private static final ParameterizedTypeReference<List<Map<String, Object>>> SEARCH_RESULT_TYPE =
        new ParameterizedTypeReference<>() {};

    private static final ParameterizedTypeReference<Map<String, String>> NAMES_RESULT_TYPE =
        new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public ProfileClient(@Value("${services.user-profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public List<Map<String, Object>> searchPharmacists(String query, String pharmacyId) {
        try {
            String uri = UriComponentsBuilder.fromPath("/api/profile/search")
                    .queryParam("role", "PHARMACIST")
                    .queryParamIfPresent("pharmacyId", java.util.Optional.ofNullable(pharmacyId))
                    .queryParamIfPresent("name", java.util.Optional.ofNullable(query))
                    .toUriString();

            List<Map<String, Object>> result = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(SEARCH_RESULT_TYPE);
            return result != null ? result : List.of();
        } catch (RestClientException e) {
            log.warn("Pharmacist search failed against user-profile-service: {}", e.getMessage());
            return List.of();
        }
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
}
