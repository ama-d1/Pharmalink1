package com.pharmalink.home_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Calls medication-service (port 8083) for the active-medication count
 * needed in the home dashboard summary. Unchanged from the old monolith
 * version — just carried over verbatim. Best-effort: a failure here must
 * not break the whole home summary.
 */
@Component
public class MedicationClient {

    private static final Logger log = LoggerFactory.getLogger(MedicationClient.class);

    private final RestClient restClient;

    public MedicationClient(@Value("${services.medication.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public long getActiveMedicationCount(String userId) {
        try {
            Long count = restClient.get()
                    .uri("/api/medications/user/{userId}/count", userId)
                    .retrieve()
                    .body(Long.class);
            return count != null ? count : 0L;
        } catch (RestClientException e) {
            log.warn("Could not fetch active medication count for user {}: {}", userId, e.getMessage());
            return 0L;
        }
    }
}
