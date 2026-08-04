package com.pharmalink.delivery_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Resolves the owning userId (and, as a fallback, a delivery address) for an
 * orderId by calling order-service's new GET /api/orders/{orderId} endpoint
 * (added alongside this service — see MICROSERVICES_PLAN.md §6 step 7a).
 *
 * Deliberately NOT best-effort: requestDelivery() only receives an orderId
 * from the frontend, never a userId, so if this call fails there is no way
 * to know who the delivery belongs to. Letting the request fail outright is
 * correct here — creating an unowned Delivery row would be worse.
 */
@Component
public class OrderClient {

    private final RestClient restClient;

    public OrderClient(@Value("${services.order.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getOrder(String orderId) {
        return restClient.get()
                .uri("/api/orders/{orderId}", orderId)
                .retrieve()
                .body(Map.class);
    }
}
