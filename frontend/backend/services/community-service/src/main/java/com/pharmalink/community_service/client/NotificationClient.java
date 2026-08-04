package com.pharmalink.community_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Calls notification-service's internal creation endpoint when someone
 * comments on a post — closes coming-soon roadmap item #3
 * (COMING_SOON_ROADMAP.md "Community activity notifications"). Same
 * best-effort pattern as order-service's NotificationClient (the one other
 * wired producer so far): a failed notification must never break comment
 * creation itself, so any failure here is logged and swallowed.
 *
 * Scope deliberately kept to "someone commented on your post" only — the
 * roadmap doc flagged this as the highest-signal, lowest-noise starting
 * point (as opposed to also notifying on likes, which would be much
 * noisier). Likes/reports notifications are not wired here; revisit if
 * that's ever wanted.
 */
@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private final RestClient restClient;

    public NotificationClient(@Value("${services.notification.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public void notifyPostComment(String postAuthorUserId, String postId, String commenterName) {
        try {
            Map<String, String> body = Map.of(
                    "userId", postAuthorUserId,
                    "type", "COMMUNITY_ACTIVITY",
                    "title", "New comment on your post",
                    "body", (commenterName != null ? commenterName : "Someone") + " commented on your post",
                    "relatedEntityId", postId
            );
            restClient.post()
                    .uri("/internal/notifications")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not create comment notification for post {}: {}", postId, e.getMessage());
        }
    }
}
