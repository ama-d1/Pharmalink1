package com.pharmalink.notification_service.client;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;

/**
 * Forwards the caller's identity (X-User-Id/X-User-Role/X-User-Email, set by
 * api-gateway's JwtAuthFilter) onto every outbound inter-service call made
 * from within a request. Copied verbatim from the same class in
 * user-profile-service/community-service/pharmacy-service — no-ops outside
 * a web request context (e.g. order-service's call into
 * POST /internal/notifications, which itself triggers this service's own
 * outbound call to user-profile-service for the email-preference lookup).
 */
public class ForwardedHeadersInterceptor implements ClientHttpRequestInterceptor {

    private static final String[] FORWARDED_HEADERS = {"X-User-Id", "X-User-Role", "X-User-Email"};

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes servletAttrs) {
            var incoming = servletAttrs.getRequest();
            for (String header : FORWARDED_HEADERS) {
                String value = incoming.getHeader(header);
                if (value != null && !request.getHeaders().containsHeader(header)) {
                    request.getHeaders().add(header, value);
                }
            }
        }
        return execution.execute(request, body);
    }
}
