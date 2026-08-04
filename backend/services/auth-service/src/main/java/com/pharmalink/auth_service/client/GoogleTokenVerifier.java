package com.pharmalink.auth_service.client;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Verifies a Google ID token server-side (auth redesign, 2026-08-04).
 *
 * The app sends whatever Google handed it; this class is the reason that is
 * safe. Anyone can POST a made-up JSON body to /api/auth/google, so nothing
 * in the token is trusted until Google itself confirms the signature — which
 * is what the tokeninfo endpoint below does.
 *
 * Implemented against Google's {@code /tokeninfo} endpoint rather than
 * pulling in {@code google-api-client} to validate the JWT locally. The
 * trade-off, stated plainly: tokeninfo costs one outbound HTTPS call per
 * sign-in and depends on Google being reachable, where local validation
 * against Google's cached JWKS would not. It is chosen here because it adds
 * no dependency and cannot get the signature/issuer/expiry checks subtly
 * wrong — Google performs them. Sign-in volume in this app is nowhere near
 * where the extra round-trip matters.
 *
 * The audience check is done HERE, not by Google: tokeninfo will happily
 * validate a token issued to somebody else's app. Without comparing `aud`
 * against our own client IDs, any Google token from any app would be
 * accepted as a PharmaLink login. That is the single most important line in
 * this file.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com";
    private static final List<String> VALID_ISSUERS = List.of("accounts.google.com", "https://accounts.google.com");

    private final RestClient restClient;
    private final List<String> allowedAudiences;

    public GoogleTokenVerifier(@Value("${google.oauth.client-ids:}") String clientIds) {
        this.restClient = RestClient.builder().baseUrl(TOKEN_INFO_URL).build();
        this.allowedAudiences = Arrays.stream(clientIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        if (allowedAudiences.isEmpty()) {
            log.warn("google.oauth.client-ids is not set — Google sign-in will reject every request. "
                    + "Set GOOGLE_OAUTH_CLIENT_IDS to your Google Cloud OAuth client IDs (comma-separated: "
                    + "web, iOS, Android) to enable it.");
        }
    }

    /** Verified identity from a Google ID token. */
    public record GoogleIdentity(String subject, String email, String givenName, String familyName, String pictureUrl) {}

    /**
     * @throws IllegalStateException when Google sign-in isn't configured
     * @throws IllegalArgumentException when the token is invalid, expired, or
     *         was issued to a different application
     */
    public GoogleIdentity verify(String idToken) {
        if (allowedAudiences.isEmpty()) {
            throw new IllegalStateException("Google sign-in is not configured on this server");
        }

        Map<String, Object> claims;
        try {
            claims = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/tokeninfo").queryParam("id_token", idToken).build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (RestClientException e) {
            // A 400 from tokeninfo means the token is bad; a connection
            // failure means Google is unreachable. Both are surfaced the same
            // way to the caller (sign-in didn't work) but logged distinctly.
            log.warn("Google ID token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Could not verify Google sign-in");
        }

        if (claims == null) {
            throw new IllegalArgumentException("Could not verify Google sign-in");
        }

        String audience = asString(claims.get("aud"));
        if (audience == null || !allowedAudiences.contains(audience)) {
            // See class javadoc — this is what stops a token minted for an
            // unrelated app from logging someone in here.
            log.warn("Rejected Google token issued to an unknown audience: {}", audience);
            throw new IllegalArgumentException("This Google sign-in was not issued for PharmaLink");
        }

        String issuer = asString(claims.get("iss"));
        if (issuer == null || !VALID_ISSUERS.contains(issuer)) {
            throw new IllegalArgumentException("Could not verify Google sign-in");
        }

        String subject = asString(claims.get("sub"));
        String email = asString(claims.get("email"));
        if (subject == null || email == null) {
            throw new IllegalArgumentException("Google sign-in did not return an email address");
        }

        // Google returns this as the STRING "true"/"false", not a boolean.
        if (!"true".equalsIgnoreCase(asString(claims.get("email_verified")))) {
            throw new IllegalArgumentException("This Google account's email address is not verified");
        }

        return new GoogleIdentity(
                subject,
                email.toLowerCase(),
                asString(claims.get("given_name")),
                asString(claims.get("family_name")),
                asString(claims.get("picture")));
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
