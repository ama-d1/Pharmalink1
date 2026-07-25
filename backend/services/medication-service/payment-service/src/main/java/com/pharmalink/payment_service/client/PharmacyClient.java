package com.pharmalink.payment_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Optional;

// Added 2026-07-24 for real Paystack payment splitting — resolves a
// pharmacy's Paystack subaccount code so PaymentService can pass it as the
// `subaccount` field on Initialize Transaction, splitting the payment 90%
// pharmacy / 10% platform at the moment of checkout. Hits
// /internal/pharmacies/**, not /api/pharmacies/** — no gateway route exists
// for /internal/**, same convention as OrderClient.
@Component
public class PharmacyClient {

    private static final Logger log = LoggerFactory.getLogger(PharmacyClient.class);

    private final RestClient restClient;

    public PharmacyClient(@Value("${services.pharmacy.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    /**
     * Best effort, same as OrderClient.getPharmacyId — a lookup failure
     * (network error, pharmacy-service down, etc.) degrades to "no
     * subaccount" rather than blocking checkout. Also returns empty when the
     * pharmacy genuinely has no subaccount set up yet (active == false) —
     * pharmacy-service's /internal/pharmacies/{id}/subaccount always
     * returns 200 for that case, never a 404, precisely so this doesn't need
     * special-case error handling here.
     */
    public Optional<String> getSubaccount(String pharmacyId) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/internal/pharmacies/{pharmacyId}/subaccount", pharmacyId)
                    .retrieve()
                    .body(Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("active"))) {
                return Optional.empty();
            }
            Object code = response.get("subaccountCode");
            return code instanceof String s && !s.isBlank() ? Optional.of(s) : Optional.empty();
        } catch (RestClientException e) {
            log.warn("Could not resolve Paystack subaccount for pharmacy {} (checkout will proceed with no payment split): {}", pharmacyId, e.getMessage());
            return Optional.empty();
        }
    }
}
