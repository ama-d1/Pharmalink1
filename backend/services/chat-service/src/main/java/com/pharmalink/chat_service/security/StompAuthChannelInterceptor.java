package com.pharmalink.chat_service.security;

import com.pharmalink.chat_service.model.Conversation;
import com.pharmalink.chat_service.service.ChatService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Real auth for chat-service's WebSocket endpoint (MICROSERVICES_PLAN.md §6
 * step 8, tracked as a Phase 2 item since chat-service's own SecurityConfig
 * and BACKEND_TODO.md's Security section both flagged it: "needs extra care
 * — STOMP CONNECT frame auth, not just HTTP headers").
 *
 * WHY this can't just reuse api-gateway's JwtAuthFilter: the gateway proxies
 * /ws/** as a raw byte-for-byte WebSocket upgrade (see JwtAuthFilter's
 * open-path javadoc) — it never parses individual STOMP frames inside that
 * connection, so it has no way to check a per-frame Authorization header the
 * way it does for ordinary HTTP requests. This service has to validate the
 * JWT itself, once, at CONNECT time.
 *
 * What this enforces:
 * <ul>
 *   <li>CONNECT — requires a valid {@code Authorization: Bearer <token>}
 *       STOMP header, signed with the same secret as auth-service/
 *       api-gateway. Invalid/missing token rejects the connection outright
 *       (throws, which Spring turns into a STOMP ERROR frame and closes the
 *       session) rather than letting an anonymous session connect.</li>
 *   <li>SUBSCRIBE — every real-time destination in this app follows the
 *       {@code /topic/conversation/{conversationId}} shape (see
 *       ChatService.sendMessage()). The authenticated userId must be a
 *       participant of that conversation (or ADMIN) — otherwise any logged-in
 *       user could subscribe to any other user's conversation just by
 *       guessing/enumerating conversationIds. Deny-by-default for any
 *       destination that doesn't match the known pattern, rather than
 *       assuming an unrecognized destination is safe.</li>
 *   <li>SEND — denied outright. Nothing in this app's design has the client
 *       send a STOMP application message (messages are posted via the
 *       ordinary REST endpoint, {@code POST /api/chat/message/send}, which
 *       already goes through the gateway's JwtAuthFilter and this service's
 *       own AuthContext/isParticipant checks — see ChatController). There is
 *       no legitimate use case for a raw client SEND frame today, so it's
 *       blocked rather than silently allowed and ignored.</li>
 * </ul>
 *
 * Not verified against a real client yet — the frontend's ChatClient.ts
 * currently doesn't send any Authorization header at CONNECT (see
 * BACKEND_TODO.md's "frontend never attaches its stored JWT" finding), so
 * this interceptor will reject every connection attempt from the app as it
 * stands today. That's a frontend-side gap, out of scope here — this class
 * is the correct server-side behavior for when the frontend is fixed to send
 * {@code connectHeaders: { Authorization: 'Bearer <token>' }}.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private static final String CONVERSATION_TOPIC_PREFIX = "/topic/conversation/";

    private final SecretKey signingKey;
    private final ChatService chatService;

    // FIXED: WebSocketConfig -> StompAuthChannelInterceptor -> ChatService ->
    // SimpMessagingTemplate -> Spring's WebSocket broker infrastructure ->
    // back to WebSocketConfig was a genuine circular bean dependency (Spring
    // refused to start with "APPLICATION FAILED TO START ... dependencies of
    // some of the beans ... form a cycle"). @Lazy here gives this constructor
    // a proxy for ChatService that only resolves the real bean the first
    // time a method on it is actually called (i.e. the first STOMP
    // SUBSCRIBE), which is well after the broker infrastructure has finished
    // initializing — breaking the cycle without changing ChatService's own
    // dependencies or anything ChatController relies on.
    public StompAuthChannelInterceptor(@Value("${security.jwt.secret}") String secret, @Lazy ChatService chatService) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.chatService = chatService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> handleConnect(accessor);
            case SUBSCRIBE -> handleSubscribe(accessor);
            case SEND -> {
                // See class javadoc — no legitimate client SEND use case exists.
                throw new StompAuthException("Client SEND frames are not supported on this endpoint");
            }
            default -> {
                // DISCONNECT, UNSUBSCRIBE, ACK, etc. — no additional checks needed.
            }
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        String token = extractBearerToken(authHeader);

        if (token == null) {
            throw new StompAuthException("Missing or malformed Authorization header on CONNECT");
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

            accessor.setUser(new StompPrincipal(userId, role, email));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("STOMP CONNECT rejected: invalid or expired token ({})", e.getMessage());
            throw new StompAuthException("Invalid or expired token");
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        StompPrincipal principal = (StompPrincipal) accessor.getUser();
        if (principal == null) {
            throw new StompAuthException("Not authenticated");
        }

        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(CONVERSATION_TOPIC_PREFIX)) {
            // Deny-by-default: no other destination pattern is expected today.
            throw new StompAuthException("Unrecognized or unauthorized subscription destination");
        }

        String conversationId = destination.substring(CONVERSATION_TOPIC_PREFIX.length());
        Conversation conversation = chatService.getConversationOrNull(conversationId);
        if (conversation == null) {
            throw new StompAuthException("Conversation not found");
        }

        boolean allowed = principal.isAdmin() || chatService.isParticipant(conversation, principal.getUserId());
        if (!allowed) {
            log.warn("User {} denied SUBSCRIBE to {} — not a participant", principal.getUserId(), destination);
            throw new StompAuthException("You may only subscribe to your own conversations");
        }
    }

    private String extractBearerToken(String header) {
        if (header == null || !header.startsWith("Bearer ")) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() ? null : token;
    }
}
