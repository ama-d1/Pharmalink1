package com.pharmalink.admin_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Reads reuse pharmacy-service's existing PUBLIC GET /api/pharmacies (that
 * data is non-sensitive — anyone can already browse pharmacies in the app —
 * so no need to duplicate a read endpoint internally). Create/verify are
 * mutations and go through /internal/pharmacies/** instead. Not best-effort:
 * admin actions need to visibly succeed or fail.
 */
@Component
public class PharmacyClient {

    private final RestClient restClient;

    public PharmacyClient(@Value("${services.pharmacy.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllPharmacies() {
        return restClient.get()
                .uri("/api/pharmacies")
                .retrieve()
                .body(List.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> createPharmacy(Map<String, Object> pharmacy) {
        return restClient.post()
                .uri("/internal/pharmacies")
                .body(pharmacy)
                .retrieve()
                .body(Map.class);
    }

    public void setVerified(String pharmacyId, boolean verified) {
        restClient.patch()
                .uri("/internal/pharmacies/{id}/verify", pharmacyId)
                .body(Map.of("verified", verified))
                .retrieve()
                .toBodilessEntity();
    }
}
