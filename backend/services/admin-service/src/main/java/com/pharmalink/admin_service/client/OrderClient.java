package com.pharmalink.admin_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class OrderClient {

    private final RestClient restClient;

    public OrderClient(@Value("${services.order.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllOrders() {
        return restClient.get()
                .uri("/internal/orders")
                .retrieve()
                .body(List.class);
    }
}
