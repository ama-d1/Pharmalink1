package com.pharmalink.community_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Calls user-profile-service to resolve author display names for posts and
 * comments. fullName used to be a local join against the monolith's
 * UserRepository (User.fullName) — that table is frozen/being retired, and
 * fullName now lives in user-profile-service. Reuses the same batch
 * endpoint chat-service built for participant-name resolution
 * (GET /internal/profiles/names?ids=...).
 *
 * Best-effort: a failed lookup falls back to "Member" (the same fallback
 * CommunityService already used in the monolith when a User row was
 * missing), rather than failing the whole request.
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

    // Added 2026-07-24 — badges pharmacist-authored posts as "Health
    // Professional" in the community feed. Same batch-by-ids shape and same
    // best-effort/fail-open-to-empty-map behavior as resolveNames() above:
    // a lookup failure just means no badges render for that batch, not a
    // broken feed.
    public Map<String, String> resolveRoles(List<String> userIds) {
        if (userIds.isEmpty()) return Map.of();
        try {
            Map<String, String> result = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/internal/profiles/roles")
                            .queryParam("ids", userIds)
                            .build())
                    .retrieve()
                    .body(NAMES_RESULT_TYPE);
            return result != null ? result : Map.of();
        } catch (RestClientException e) {
            log.warn("Batch role resolution failed against user-profile-service: {}", e.getMessage());
            return Map.of();
        }
    }

    // Coming-soon roadmap item #3: gates the comment-notification call in
    // CommunityService so the "Community Activity" toggle in the frontend
    // actually controls something. Fails open (true) on any error — same
    // reasoning as ProfileService.isCommunityAlertsEnabled() on the other
    // side: this is a nice-to-have preference check, not a security
    // boundary, so a transient failure here should never silently swallow
    // a notification someone actually wants.
    public boolean isCommunityAlertsEnabled(String userId) {
        try {
            Map<String, Boolean> result = restClient.get()
                    .uri("/internal/profiles/{userId}/community-alerts", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Boolean>>() {});
            return result == null || result.getOrDefault("enabled", true);
        } catch (RestClientException e) {
            log.warn("Community-alerts preference lookup failed for user {}: {}", userId, e.getMessage());
            return true;
        }
    }
}
