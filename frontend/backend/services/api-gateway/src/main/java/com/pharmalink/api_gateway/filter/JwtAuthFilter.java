package com.pharmalink.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The single JWT validation point for the whole system
 * (MICROSERVICES_PLAN.md §5.2, confirmed decision #2). Every request to a
 * protected route must carry a valid {@code Authorization: Bearer <token>}
 * header signed by auth-service's {@code JwtService} — same secret, same
 * HS256-family signing (jjwt derives the algorithm from key length). On
 * success, the userId/email/role claims are forwarded downstream as
 * {@code X-User-Id}/{@code X-User-Email}/{@code X-User-Role} headers;
 * services can trust these because (by design) they only ever accept
 * traffic from the gateway on the private Docker network — that trust
 * boundary is a Phase 2 hardening item (locking down direct access to each
 * service), not something this filter itself enforces.
 *
 * Deliberately implemented as a plain {@link GlobalFilter} rather than
 * Spring Security's reactive stack (spring-security-webflux) — a single
 * header check/JWT parse doesn't need a whole security filter chain, and
 * keeps the gateway's dependency footprint smaller.
 *
 * Open (unauthenticated) paths, decided explicitly rather than guessed:
 * <ul>
 *   <li>{@code /api/auth/register}, {@code /api/auth/login},
 *       {@code /api/auth/forgot-password}, {@code /api/auth/reset-password}
 *       — this is how a client obtains a token in the first place, plus
 *       forgot/reset-password, which by definition can't require a token
 *       from an already-authenticated session.</li>
 *   <li>{@code /api/auth/2fa/verify}, {@code /api/auth/2fa/resend} —
 *       coming-soon roadmap item #9. These complete/assist an in-progress
 *       login (the frontend has no token yet at this point either), so they
 *       have to be open too.</li>
 *   <li>{@code /ws/**} — chat-service's raw WebSocket/STOMP endpoint. Real
 *       STOMP CONNECT-frame auth is handled in chat-service itself (Phase 2
 *       — see chat-service's StompAuthChannelInterceptor), not here; the
 *       gateway still just proxies the HTTP upgrade request through.</li>
 *   <li>{@code /api/*}{@code /health} (exactly one segment between
 *       {@code /api/} and {@code /health}, e.g. {@code /api/pharmacies/health},
 *       {@code /api/profile/health}) — each service's own basic liveness
 *       check, no user-specific data returned by any of them.</li>
 * </ul>
 *
 * FIXED (2026-07-24): this open-path health check used to be
 * {@code path.endsWith("/health")}, which was meant only for the exact
 * single-segment liveness routes above but also silently matched ANY path
 * ending in that literal word — including user-profile-service's real,
 * authenticated {@code PUT /api/profile/{userId}/health} (the "Edit Health
 * Info" save endpoint, which just happens to end in "/health" too, for an
 * unrelated reason). Because this filter treated that route as open, it
 * never validated the JWT or forwarded X-User-Id/X-User-Role, so
 * user-profile-service's AuthContext.isOwnerOrAdmin() saw a null caller id
 * and correctly, but confusingly, rejected every save with "You may only
 * access your own data" — the ownership check itself was never the bug.
 * Narrowed to an exact single-segment AntPathMatcher pattern so it only
 * ever matches real {@code /api/<service>/health} liveness checks.
 *
 * IMPORTANT (changed 2026-07-22, coming-soon roadmap item #9): this used to
 * be a single blanket {@code /api/auth/**} entry, which meant EVERY current
 * and future auth-service endpoint was wide open with no way to add an
 * authenticated one. Narrowed to exact sub-paths specifically so
 * {@code GET/PATCH /api/auth/2fa} (the 2FA enable/disable toggle) could
 * become a normal protected route instead of also being unauthenticated.
 * Any new auth-service endpoint from here on is protected by default unless
 * explicitly added to this list — that's the safer default.
 *
 * Phase 2 addition: role enforcement for {@code /api/admin/**}. Every other
 * protected route only requires SOME valid token; admin routes additionally
 * require the token's {@code role} claim to be {@code ADMIN}. This closes
 * the biggest flagged gap from admin-service's build (step 7c) — previously
 * any logged-in PATIENT/PHARMACIST could reach every admin endpoint.
 */
@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private static final List<String> OPEN_PATH_PATTERNS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/2fa/verify",
            "/api/auth/2fa/resend",
            "/ws/**",
            // Added 2026-07-23 (payment-service) — Paystack's own hosted
            // checkout redirects here after payment; that navigation carries
            // no JWT (it comes from Paystack's domain, not our app). The
            // real authoritative check still happens server-side inside
            // payment-service (it calls Paystack's own verify API itself,
            // never trusts this navigation) — see PaymentController's
            // callback() javadoc.
            "/api/payments/callback/**"
    );
    private static final String ADMIN_PATH_PATTERN = "/api/admin/**";
    private static final String ADMIN_ROLE = "ADMIN";

    private final SecretKey signingKey;

    public JwtAuthFilter(@Value("${security.jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public int getOrder() {
        // Run before Spring Cloud Gateway's routing filters so an
        // unauthenticated request never reaches a downstream service.
        return -1;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isOpenPath(path)) {
            return chain.filter(exchange);
        }

        List<String> authHeaders = request.getHeaders().getOrEmpty(HttpHeaders.AUTHORIZATION);
        String token = extractBearerToken(authHeaders);

        if (token == null) {
            return unauthorized(exchange, "Missing or malformed Authorization header");
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.get("userId", String.class);
            String role = claims.get("role", String.class);
            String email = claims.getSubject();

            if (PATH_MATCHER.match(ADMIN_PATH_PATTERN, path) && !ADMIN_ROLE.equals(role)) {
                log.warn("Non-admin user {} (role={}) denied access to admin route {}", userId, role, path);
                return forbidden(exchange, "Admin role required");
            }

            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-User-Id", userId)
                    .header("X-User-Role", role)
                    .header("X-User-Email", email)
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed for {}: {}", path, e.getMessage());
            return unauthorized(exchange, "Invalid or expired token");
        }
    }

    private static final String HEALTH_CHECK_PATTERN = "/api/*/health";

    private boolean isOpenPath(String path) {
        // FIXED — was `path.endsWith("/health")`, which also matched
        // /api/profile/{userId}/health (a real authenticated endpoint) and
        // would match the same way for any other service that ever adds a
        // user-scoped sub-route ending in "/health". This AntPathMatcher
        // pattern only matches exactly one segment between /api/ and
        // /health, i.e. real service liveness checks only. See this
        // filter's class javadoc for the full story.
        if (PATH_MATCHER.match(HEALTH_CHECK_PATTERN, path)) {
            return true;
        }
        return OPEN_PATH_PATTERNS.stream().anyMatch(pattern -> PATH_MATCHER.match(pattern, path));
    }

    private String extractBearerToken(List<String> authHeaders) {
        if (authHeaders.isEmpty()) return null;
        String header = authHeaders.get(0);
        if (header == null || !header.startsWith("Bearer ")) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() ? null : token;
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        return respondWithError(exchange, HttpStatus.UNAUTHORIZED, message);
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String message) {
        return respondWithError(exchange, HttpStatus.FORBIDDEN, message);
    }

    private Mono<Void> respondWithError(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"message\":\"" + message.replace("\"", "'") + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
