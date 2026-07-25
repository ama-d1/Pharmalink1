package com.pharmalink.payment_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.Map;

// Talks to Paystack's real API (https://paystack.com/docs/api/) — this is
// the one place in the whole system that actually calls a payment gateway.
// GHS only: this project's Paystack merchant account is Ghana-registered,
// and Paystack does not allow a second currency on a Ghana account (a
// business would need to be Nigeria- or Kenya-based to add USD alongside
// its base currency) — see TODO.md for that research.
//
// Amounts are always in the smallest currency unit (pesewas for GHS, same
// idea as kobo for NGN or cents for USD) per Paystack's API contract — the
// caller (PaymentService) is responsible for converting GHS to pesewas
// before calling initializeTransaction.
@Component
public class PaystackClient {

    private static final Logger log = LoggerFactory.getLogger(PaystackClient.class);

    private final RestClient restClient;

    public PaystackClient(@Value("${paystack.secret-key}") String secretKey) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.paystack.co")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
                .build();
    }

    public record InitializeResult(boolean ok, String authorizationUrl, String accessCode, String message) {}

    public InitializeResult initializeTransaction(String email, long amountPesewas, String reference, String callbackUrl) {
        return initializeTransaction(email, amountPesewas, reference, callbackUrl, null);
    }

    /**
     * Added 2026-07-24 for real payment splitting — subaccountCode is the
     * pharmacy's Paystack subaccount (see pharmacy-service's PaystackClient
     * and PayoutController), resolved best-effort by PaymentService via
     * OrderClient + PharmacyClient. When non-null, Paystack itself splits
     * this transaction at the moment of payment: 90% to the pharmacy's
     * subaccount, 10% stays with the platform (percentage_charge=10 set at
     * subaccount-creation time). When null (pharmacy hasn't set up a
     * subaccount yet, or the lookup failed), the field is omitted entirely
     * and the platform receives 100% — the exact behavior this system had
     * before this feature existed, so payments never break for a pharmacy
     * that hasn't onboarded yet.
     */
    public InitializeResult initializeTransaction(String email, long amountPesewas, String reference, String callbackUrl, String subaccountCode) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("email", email);
            body.put("amount", amountPesewas);
            body.put("currency", "GHS");
            body.put("reference", reference);
            body.put("callback_url", callbackUrl);
            if (subaccountCode != null && !subaccountCode.isBlank()) {
                body.put("subaccount", subaccountCode);
            }

            Map<String, Object> response = restClient.post()
                    .uri("/transaction/initialize")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("status"))) {
                String msg = response != null ? String.valueOf(response.get("message")) : "empty response";
                log.warn("Paystack initialize returned non-success: {}", msg);
                return new InitializeResult(false, null, null, msg);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            return new InitializeResult(true, (String) data.get("authorization_url"), (String) data.get("access_code"), "ok");
        } catch (RestClientException e) {
            log.warn("Paystack initializeTransaction call failed: {}", e.getMessage());
            return new InitializeResult(false, null, null, e.getMessage());
        }
    }

    public record VerifyResult(boolean ok, String gatewayStatus, long amountPesewas, String currency, String message) {}

    public VerifyResult verifyTransaction(String reference) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/transaction/verify/{reference}", reference)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("status"))) {
                String msg = response != null ? String.valueOf(response.get("message")) : "empty response";
                return new VerifyResult(false, null, 0, null, msg);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            String gatewayStatus = (String) data.get("status"); // "success", "failed", "abandoned", ...
            long amount = data.get("amount") instanceof Number n ? n.longValue() : 0L;
            String currency = (String) data.get("currency");
            return new VerifyResult(true, gatewayStatus, amount, currency, "ok");
        } catch (RestClientException e) {
            log.warn("Paystack verifyTransaction call failed: {}", e.getMessage());
            return new VerifyResult(false, null, 0, null, e.getMessage());
        }
    }
}
