package com.pharmalink.notification_service.client;

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
 * Calls user-profile-service to decide whether (and where) to email a user
 * for a notification — coming-soon roadmap item #6. Deliberately does NOT
 * fail-open here (unlike ProfileClient.isCommunityAlertsEnabled() elsewhere
 * in this codebase): a failed lookup means "don't know this user's email or
 * preference," and guessing an email address wrong is worse than just
 * skipping the email for this one notification. The in-app notification
 * itself is unaffected either way — this is called after that row is
 * already saved, from NotificationService.create()'s best-effort tail.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private final RestClient restClient;

    public ProfileClient(@Value("${services.user-profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    /**
     * @return the user's email if they have a profile AND emailNotifications
     *         is enabled; empty otherwise (missing profile, disabled
     *         preference, or a failed lookup all collapse to the same
     *         "don't send" result).
     */
    public Optional<String> getEmailIfEnabled(String userId) {
        try {
            Map<String, Object> result = restClient.get()
                    .uri("/internal/profiles/{userId}/email-preference", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (result == null || result.isEmpty()) return Optional.empty();
            boolean enabled = Boolean.TRUE.equals(result.get("enabled"));
            Object email = result.get("email");
            if (!enabled || !(email instanceof String) || ((String) email).isBlank()) return Optional.empty();
            return Optional.of((String) email);
        } catch (RestClientException e) {
            log.warn("Email-preference lookup failed for user {}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }
}
