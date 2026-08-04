package com.pharmalink.order_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Calls notification-service's internal creation endpoint when an order's
 * status changes. Best-effort: a failed notification must never break
 * payment processing itself — the order status change is the thing that
 * actually matters; the notification is a nice-to-have on top of it.
 *
 * This is the one producer wired in this pass, per your explicit choice
 * (order-status only; chat/community deferred) — see
 * MICROSERVICES_PLAN.md §6 step 7b.
 */
@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private final RestClient restClient;

    public NotificationClient(@Value("${services.notification.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public void notifyOrderStatusChange(String userId, String orderId, String newStatus) {
        try {
            Map<String, String> body = Map.of(
                    "userId", userId,
                    "type", "ORDER_STATUS",
                    "title", "Order update",
                    "body", "Your order status changed to " + newStatus,
                    "relatedEntityId", orderId
            );
            restClient.post()
                    .uri("/internal/notifications")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Could not create order-status notification for order {}: {}", orderId, e.getMessage());
        }
    }
}
