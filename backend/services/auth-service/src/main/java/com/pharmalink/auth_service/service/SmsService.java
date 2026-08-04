package com.pharmalink.auth_service.service;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Sends the sign-up verification code by SMS through Arkesel
 * (https://sms.arkesel.com), added 2026-08-04 when phone became the primary
 * verification channel.
 *
 * Uses Arkesel's V2 JSON API rather than the older V1 query-string endpoint:
 * V1 puts the API key in the URL, which means it lands in every access log
 * and proxy trace between here and Arkesel. V2 sends it as an `api-key`
 * header instead.
 *
 * Every failure throws. That is deliberate — AuthService catches it and falls
 * back to email, which it can only do if it's told the send failed. Swallowing
 * errors here would leave users waiting for an SMS that never arrives with no
 * fallback and no signal.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String senderId;
    private final String defaultCountryCode;

    public SmsService(
            @Value("${sms.arkesel.base-url:https://sms.arkesel.com}") String baseUrl,
            @Value("${sms.arkesel.api-key:}") String apiKey,
            @Value("${sms.arkesel.sender-id:PharmaLink}") String senderId,
            @Value("${sms.default-country-code:233}") String defaultCountryCode) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.senderId = senderId;
        this.defaultCountryCode = defaultCountryCode.replaceAll("\\D", "");

        if (this.apiKey.isEmpty()) {
            log.warn("sms.arkesel.api-key is not set — verification codes will be emailed instead of texted. "
                    + "Set ARKESEL_API_KEY to enable SMS.");
        }
        // Arkesel rejects sender IDs longer than 11 characters outright, and
        // the rejection reads as a generic failure — worth catching at boot
        // rather than on a user's first sign-up.
        if (senderId != null && senderId.length() > 11) {
            log.warn("sms.arkesel.sender-id \"{}\" is {} characters — Arkesel allows a maximum of 11 and will "
                    + "reject every send.", senderId, senderId.length());
        }
    }

    /** Whether SMS is usable at all; AuthService checks this before trying. */
    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    /**
     * Arkesel wants a bare international number — no "+", no spaces, country
     * code included ("233241234567").
     *
     * A local number typed as "024 123 4567" has its leading 0 replaced with
     * the configured country code, which is the one transformation that can't
     * be skipped: sending "0241234567" as-is is silently rejected or
     * misrouted. Anything already carrying a country code is left alone.
     */
    String toArkeselRecipient(String rawPhone) {
        if (rawPhone == null) return null;
        String digits = rawPhone.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;

        if (digits.startsWith("0")) {
            return defaultCountryCode + digits.substring(1);
        }
        if (digits.startsWith(defaultCountryCode)) {
            return digits;
        }
        // A number that starts with neither a 0 nor the default country code
        // is assumed to already be international (a subscriber signing up
        // from another country). Guessing otherwise would corrupt it.
        return digits;
    }

    /**
     * @throws IllegalStateException when SMS isn't configured or Arkesel
     *         rejects the send — caught by AuthService, which then falls back
     *         to email.
     */
    public void sendVerificationCode(String phoneNumber, String code, long validMinutes) {
        if (!isConfigured()) {
            throw new IllegalStateException("SMS is not configured");
        }

        String recipient = toArkeselRecipient(phoneNumber);
        if (recipient == null) {
            throw new IllegalStateException("No usable phone number for this account");
        }

        String message = "Your PharmaLink verification code is " + code
                + ". It expires in " + validMinutes + " minutes. "
                + "If you didn't create a PharmaLink account, you can ignore this message.";

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri("/api/v2/sms/send")
                    .header("api-key", apiKey)
                    .body(Map.of(
                            "sender", senderId,
                            "message", message,
                            "recipients", List.of(recipient)))
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (RestClientException e) {
            throw new IllegalStateException("Could not reach the SMS provider: " + e.getMessage(), e);
        }

        // Arkesel answers 200 with a "status" field even for business-level
        // failures (insufficient balance, unapproved sender ID, bad number),
        // so the HTTP status alone proves nothing — the body has to be read.
        Object status = response == null ? null : response.get("status");
        if (!"success".equalsIgnoreCase(String.valueOf(status))) {
            throw new IllegalStateException("SMS provider rejected the message: "
                    + (response == null ? "empty response" : response));
        }

        log.info("Verification SMS sent to {}", maskForLog(recipient));
    }

    /** Logs shouldn't carry full phone numbers; the last 4 is enough to trace. */
    private static String maskForLog(String recipient) {
        return recipient.length() <= 4 ? "****" : "****" + recipient.substring(recipient.length() - 4);
    }
}
