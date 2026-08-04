package com.pharmalink.payment_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Optional;

// Calls order-service's internal-only endpoint to finalize an order's
// payment status once Paystack has actually confirmed the transaction —
// this is what replaces the old fake flip that used to live directly in
// OrderService.processPayment() (see order-service's OrderService javadoc).
// Hits /internal/orders/**, not /api/orders/** — no gateway route exists for
// /internal/**, so this is only reachable service-to-service, same
// convention as every other internal endpoint in this system.
@Component
public class OrderClient {

    private static final Logger log = LoggerFactory.getLogger(OrderClient.class);

    // Lets RestClient deserialize straight into a generic Map instead of the
    // raw `Map.class`, which forced an unchecked assignment at every call
    // site. Type-safe rather than @SuppressWarnings'd away.
    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public OrderClient(@Value("${services.order.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    /**
     * Added 2026-07-24 for real Paystack payment splitting — resolves which
     * pharmacy an order belongs to so PaymentService can look up that
     * pharmacy's subaccount and apply the 90/10 split at checkout. Best
     * effort like markPaymentResult above: a lookup failure here should
     * NEVER block checkout, it should just mean no split gets applied (the
     * platform receives 100%, same as before this feature existed) — logged
     * clearly so it's visible without being fatal.
     */
    public Optional<String> getPharmacyId(String orderId) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/internal/orders/{orderId}", orderId)
                    .retrieve()
                    .body(JSON_OBJECT);
            if (response == null) return Optional.empty();
            Object pharmacyId = response.get("pharmacyId");
            return pharmacyId instanceof String s && !s.isBlank() ? Optional.of(s) : Optional.empty();
        } catch (RestClientException e) {
            log.warn("Could not resolve pharmacyId for order {} (checkout will proceed with no payment split): {}", orderId, e.getMessage());
            return Optional.empty();
        }
    }

    public boolean markPaymentResult(String orderId, boolean paid) {
        try {
            restClient.patch()
                    .uri("/internal/orders/{orderId}/payment-result", orderId)
                    .body(Map.of("paid", paid))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientException e) {
            log.warn("Could not update payment result on order-service for order {}: {}", orderId, e.getMessage());
            return false;
        }
    }
}
