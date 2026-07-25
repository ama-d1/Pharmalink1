package com.pharmalink.order_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

// Moved from the monolith's client/DrugCatalogClient.java (added there
// during step 4, now that order-service is the one that actually needs it).
@Component
public class DrugCatalogClient {

    private static final Logger log = LoggerFactory.getLogger(DrugCatalogClient.class);

    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_TYPE =
        new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public DrugCatalogClient(@Value("${services.drug-catalog.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public List<Map<String, Object>> getAvailableDrugs() {
        try {
            List<Map<String, Object>> result = restClient.get()
                    .uri("/api/drugs/catalog")
                    .retrieve()
                    .body(LIST_TYPE);
            return result != null ? result : List.of();
        } catch (RestClientException e) {
            log.warn("Could not fetch drug catalog from drug-catalog-service: {}", e.getMessage());
            return List.of();
        }
    }
}
