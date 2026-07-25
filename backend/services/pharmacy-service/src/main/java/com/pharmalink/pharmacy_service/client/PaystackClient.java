package com.pharmalink.pharmacy_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Added 2026-07-24 for real Paystack payment splitting. Separate from
 * payment-service's own PaystackClient — there's no shared module in this
 * codebase, and the two clients hit different Paystack endpoints for a
 * different purpose (this one is about *setting up* a pharmacy's payout
 * destination; payment-service's is about *taking* a payment). Same secret
 * key, same "https://api.paystack.co" base, same Bearer-auth convention.
 */
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

    public record Bank(String name, String code) {}

    /**
     * GET /bank?currency=ghs — the list an OWNER picks their bank from when
     * linking a payout account. Ghana-only, matching this merchant account's
     * currency (see payment-service's PaystackClient javadoc for why GHS is
     * the only currency this whole system ever deals in).
     */
    @SuppressWarnings("unchecked")
    public List<Bank> listBanks() {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/bank?currency=ghs")
                    .retrieve()
                    .body(Map.class);

            List<Bank> banks = new ArrayList<>();
            if (response != null && response.get("data") instanceof List<?> data) {
                for (Object o : data) {
                    if (o instanceof Map<?, ?> m) {
                        Object name = m.get("name");
                        Object code = m.get("code");
                        if (name instanceof String && code instanceof String) {
                            banks.add(new Bank((String) name, (String) code));
                        }
                    }
                }
            }
            return banks;
        } catch (RestClientException e) {
            log.warn("Paystack listBanks call failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * GET /bank/resolve — verifies an account number against a bank before
     * it's ever saved, so an OWNER sees the real account holder's name and
     * can catch a typo before money starts routing there. Paystack returns
     * 422 for an invalid account/bank combo; that's an expected outcome
     * here, not a system failure, so it's caught and folded into an empty
     * Optional rather than propagated as an exception.
     */
    @SuppressWarnings("unchecked")
    public Optional<String> resolveAccount(String accountNumber, String bankCode) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/bank/resolve?account_number={num}&bank_code={code}", accountNumber, bankCode)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        // Swallow here; handled by the catch block below via
                        // RestClientException that onStatus throws by default
                        // when not overridden — see comment on the exception
                        // handler.
                    })
                    .body(Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("status"))) {
                return Optional.empty();
            }
            Object data = response.get("data");
            if (data instanceof Map<?, ?> m && m.get("account_name") instanceof String name) {
                return Optional.of(name);
            }
            return Optional.empty();
        } catch (RestClientException e) {
            log.info("Paystack resolveAccount could not verify {}/{}: {}", bankCode, accountNumber, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * POST /subaccount — creates the actual Paystack subaccount that later
     * gets passed as the `subaccount` field on Initialize Transaction
     * (payment-service's PaystackClient) to split a payment 90/10 at the
     * moment of checkout. percentage_charge is what PLATFORM keeps in
     * Paystack's model (the pharmacy gets the remainder), so 10 here means
     * "platform takes 10%, pharmacy gets 90%" — matches this feature's spec.
     */
    @SuppressWarnings("unchecked")
    public Optional<String> createSubaccount(String businessName, String bankCode, String accountNumber) {
        try {
            Map<String, Object> body = Map.of(
                    "business_name", businessName,
                    "settlement_bank", bankCode,
                    "account_number", accountNumber,
                    "percentage_charge", 10
            );

            Map<String, Object> response = restClient.post()
                    .uri("/subaccount")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("status"))) {
                String msg = response != null ? String.valueOf(response.get("message")) : "empty response";
                log.warn("Paystack createSubaccount returned non-success: {}", msg);
                return Optional.empty();
            }
            Object data = response.get("data");
            if (data instanceof Map<?, ?> m && m.get("subaccount_code") instanceof String code) {
                return Optional.of(code);
            }
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("Paystack createSubaccount call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
