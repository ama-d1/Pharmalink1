package com.pharmalink.auth_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Calls user-profile-service. Two very different reliability requirements:
 *
 * - createProfile() (used by register()): NOT best-effort. If this fails,
 *   registration fails too — a User row with no profile row is a broken
 *   account (no display name anywhere). This is a synchronous call, not a
 *   saga/outbox pattern; for a project this size that's an acceptable
 *   trade-off, but it's worth knowing this could leave the two databases
 *   inconsistent if the process crashes between the two writes. A real
 *   production system would want an outbox table + retry here instead.
 *
 * - fetchFullName() (used by login()): best-effort. Login must not fail
 *   just because a display-name lookup timed out — that's not what "auth"
 *   is for. Returns null on any failure.
 */
@Component
public class ProfileClient {

    private static final Logger log = LoggerFactory.getLogger(ProfileClient.class);

    private final RestClient restClient;

    public ProfileClient(@Value("${services.profile.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    // role/email params added during chat-service extraction (step 5b) —
    // user-profile-service denormalizes them for pharmacist search. See
    // Profile's class javadoc in user-profile-service for why.
    //
    // firstName/lastName/dateOfBirth added 2026-08-04 with the auth redesign,
    // whose sign-up form collects them. phoneNumber became nullable at the
    // same time: a Google sign-in creates an account with no phone at all.
    public void createProfile(String userId, String fullName, String phoneNumber, String role, String email,
                              String firstName, String lastName, LocalDate dateOfBirth) {
        // HashMap, not Map.of() — Map.of() throws on a null value, and three
        // of these are legitimately nullable now.
        Map<String, Object> body = new HashMap<>();
        body.put("userId", userId);
        body.put("fullName", fullName);
        body.put("phoneNumber", phoneNumber);
        body.put("role", role);
        body.put("email", email);
        body.put("firstName", firstName);
        body.put("lastName", lastName);
        body.put("dateOfBirth", dateOfBirth == null ? null : dateOfBirth.toString());

        restClient.post()
                .uri("/internal/profiles")
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    // FIXED (2026-07-24) — this used to call GET /api/profile/{userId}, the
    // PUBLIC/gateway-facing route. That endpoint's controller method
    // (ProfileController.getProfile) enforces AuthContext.isOwnerOrAdmin(),
    // which reads the X-User-Id header api-gateway's JwtAuthFilter forwards
    // from a caller's JWT. This call, though, is auth-service talking
    // directly to user-profile-service right after issuing a fresh token —
    // there is no inbound X-User-Id to forward (that's the whole point of
    // just having logged in), so isOwnerOrAdmin() always saw a null caller
    // and always returned 403. RestClient throws on any 4xx by default, so
    // that 403 landed in the catch below every single time and silently
    // returned null — which is exactly why "greeting shows your name after
    // register, but never after login" happened 100% of the time, not
    // intermittently: register() never calls this at all (it already has
    // the name from the request body), only login() does.
    //
    // Fixed by calling the actual internal, service-to-service route
    // instead (/internal/profiles/names — the same batch name-resolution
    // endpoint chat-service and community-service already use), which has
    // no ownership check because nothing outside another backend service
    // can reach it (see InternalProfileController's class javadoc /
    // SecurityConfig's permitAll("/internal/**")).
    public String fetchFullName(String userId) {
        try {
            Map<String, String> names = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/internal/profiles/names")
                            .queryParam("ids", List.of(userId))
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, String>>() {});
            return names != null ? names.get(userId) : null;
        } catch (RestClientException e) {
            log.warn("Could not fetch fullName for user {} from user-profile-service: {}", userId, e.getMessage());
            return null;
        }
    }
}
