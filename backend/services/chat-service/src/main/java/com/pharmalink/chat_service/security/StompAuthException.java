package com.pharmalink.chat_service.security;

/**
 * Thrown by {@link StompAuthChannelInterceptor} to reject a STOMP frame
 * (CONNECT/SUBSCRIBE/SEND). Spring's STOMP support turns an exception thrown
 * from an inbound channel interceptor into a STOMP ERROR frame and closes the
 * session — there is no need to catch this anywhere else.
 */
public class StompAuthException extends RuntimeException {
    public StompAuthException(String message) {
        super(message);
    }
}
