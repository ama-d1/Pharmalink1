package com.pharmalink.chat_service.config;

import com.pharmalink.chat_service.security.StompAuthChannelInterceptor;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

// Originally moved as-is from the monolith's config/WebSocketConfig.java.
// Phase 2 addition (MICROSERVICES_PLAN.md §6 step 8): registers
// StompAuthChannelInterceptor on the inbound channel so CONNECT/SUBSCRIBE
// frames get real auth — see that class's javadoc for what it enforces and
// why it has to live here rather than at api-gateway.
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    public WebSocketConfig(StompAuthChannelInterceptor stompAuthChannelInterceptor) {
        this.stompAuthChannelInterceptor = stompAuthChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }

    // FIXED (2026-07-24) — real root cause of "recording works but can't
    // send" for voice notes/video clips. Spring's STOMP-over-WebSocket
    // transport defaults to a 64KB message size limit (setMessageSizeLimit),
    // which was never overridden here. ChatService.sendMessage() saves the
    // message to Postgres FIRST, then broadcasts it via
    // messagingTemplate.convertAndSend("/topic/conversation/{id}", saved) —
    // that broadcast carries the FULL message, including its base64
    // mediaUrl data URI. A base64-encoded voice note or video clip is
    // essentially always well over 64KB (base64 alone inflates raw bytes by
    // ~33%, before even counting a few seconds of real audio/video data),
    // so that convertAndSend() call was throwing every time — AFTER the
    // database write already succeeded, which is exactly why this looked
    // like "the recording itself is fine, but sending always fails": the
    // POST /api/chat/message/send request errors out on the broadcast step,
    // even though the message was actually persisted. This was invisible
    // in earlier testing because plain TEXT messages are always well under
    // 64KB. 15MB matches the same ceiling already set for the equivalent
    // REST payload limit at api-gateway (spring.codec.max-in-memory-size,
    // see that service's application.yaml) and chat-service's own
    // mediaUrl TEXT column — one consistent size ceiling across the whole
    // media-message path, not just the initial REST POST.
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(15 * 1024 * 1024);
        registration.setSendBufferSizeLimit(15 * 1024 * 1024);
        registration.setSendTimeLimit(20_000);
    }
}
