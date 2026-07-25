package com.pharmalink.user_profile_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Calls out to medication-service (port 8083) for the pieces of a user's
 * profile summary/adherence report that live there: active medication
 * count, dose logging, and total doses logged.
 *
 * getActiveMedicationCount() and getDoseCount() are best-effort — a failure
 * must never break getProfile()/getAdherenceReport() as a whole, so errors
 * are logged and swallowed, defaulting to 0.
 *
 * logDose() is NOT best-effort — if it fails, ProfileService.logDose()
 * should let the failure propagate rather than silently updating
 * dayStreak/adherenceRate for a dose that was never actually recorded in
 * medication-service. Same asymmetric-reliability reasoning as
 * auth-service's ProfileClient (see that class's javadoc).
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

    public long getDoseCount(String userId) {
        try {
            Long count = restClient.get()
                    .uri("/api/medications/user/{userId}/dose-count", userId)
                    .retrieve()
                    .body(Long.class);
            return count != null ? count : 0L;
        } catch (RestClientException e) {
            log.warn("Could not fetch dose count for user {}: {}", userId, e.getMessage());
            return 0L;
        }
    }

    public void logDose(String userId, String medicationId) {
        restClient.post()
                .uri("/api/medications/{medicationId}/dose-log", medicationId)
                .body(Map.of("userId", userId))
                .retrieve()
                .toBodilessEntity();
    }
}
