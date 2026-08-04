package com.pharmalink.chat_service.client;

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
 * from within a request. Without this, a downstream service receiving a
 * service-to-service call has no way to know which end user originally
 * triggered it — which is exactly what per-request ownership checks
 * (Phase 2, MICROSERVICES_PLAN.md §6 step 8) need downstream. No-ops
 * outside a web request context (nothing to read headers from — e.g. a
 * future scheduled job with no incoming request).
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
