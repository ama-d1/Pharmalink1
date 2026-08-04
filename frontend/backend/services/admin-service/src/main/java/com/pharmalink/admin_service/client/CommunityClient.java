package com.pharmalink.admin_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class CommunityClient {

    private final RestClient restClient;

    public CommunityClient(@Value("${services.community.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getReportedPosts() {
        return restClient.get()
                .uri("/internal/community/reports")
                .retrieve()
                .body(List.class);
    }

    public void deletePost(String postId) {
        restClient.delete()
                .uri("/internal/community/posts/{postId}", postId)
                .retrieve()
                .toBodilessEntity();
    }

    public void deleteComment(String commentId) {
        restClient.delete()
                .uri("/internal/community/comments/{commentId}", commentId)
                .retrieve()
                .toBodilessEntity();
    }
}
