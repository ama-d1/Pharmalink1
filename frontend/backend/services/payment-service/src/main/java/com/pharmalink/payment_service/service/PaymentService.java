package com.pharmalink.payment_service.service;

import com.pharmalink.payment_service.client.OrderClient;
import com.pharmalink.payment_service.client.PaystackClient;
import com.pharmalink.payment_service.client.PharmacyClient;
import com.pharmalink.payment_service.dto.InitializePaymentRequest;
import com.pharmalink.payment_service.model.Payment;
import com.pharmalink.payment_service.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaystackClient paystackClient;
    private final OrderClient orderClient;
    private final PharmacyClient pharmacyClient;
    private final String callbackBaseUrl;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaystackClient paystackClient,
            OrderClient orderClient,
            PharmacyClient pharmacyClient,
            @Value("${paystack.callback-base-url}") String callbackBaseUrl) {
        this.paymentRepository = paymentRepository;
        this.paystackClient = paystackClient;
        this.orderClient = orderClient;
        this.pharmacyClient = pharmacyClient;
        this.callbackBaseUrl = callbackBaseUrl;
    }

    /**
     * Starts a Paystack transaction for an order. Generates our own
     * reference up front (a UUID) so we can look this Payment row up the
     * moment the frontend calls back to verify — Paystack's own reference
     * would only exist after a successful initialize call, which is one
     * round trip too late for a reliable idempotency key.
     *
     * amountGhs is converted to pesewas here (× 100, rounded) since
     * Paystack's API always works in the smallest currency unit.
     */
    public Payment initialize(InitializePaymentRequest request) {
        long amountPesewas = BigDecimal.valueOf(request.getAmountGhs())
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        Payment payment = new Payment();
        payment.setOrderId(request.getOrderId());
        payment.setUserId(request.getUserId());
        payment.setAmountPesewas(amountPesewas);
        payment.setOurReference(UUID.randomUUID().toString());
        payment.setStatus(Payment.Status.PENDING);
        payment = paymentRepository.save(payment);

        // callback_url is where Paystack's own hosted checkout page redirects
        // the browser/webview after the user finishes. IMPORTANT (found
        // 2026-07-23): this URL does NOT need to be reachable at all — the
        // frontend's WebView intercepts navigation to it via
        // onShouldStartLoadWithRequest and blocks the load entirely before
        // it ever hits the network (see frontend/app/payment.tsx's
        // CALLBACK_PATH_MARKER comment). It only needs to be recognizable BY
        // PATH, since the frontend matches on the "/api/payments/callback/"
        // substring regardless of host. This used to be a real bug: this
        // value defaulted to http://localhost:8080 (meaningless on a phone —
        // Paystack would try to redirect the WebView there and show a dead
        // connection-error page right after a successful payment) before the
        // frontend fix made the actual host irrelevant.
        //
        // This is NOT a server-to-server webhook (Paystack's dashboard
        // webhook feature needs a publicly reachable URL, which a local dev
        // backend behind a hotspot doesn't have). Verification is
        // client-triggered but still authoritative, because we call
        // Paystack's own /transaction/verify/:reference API ourselves rather
        // than trusting anything the frontend claims.
        String callbackUrl = callbackBaseUrl + "/api/payments/callback/" + payment.getOurReference();

        // Added 2026-07-24 for real payment splitting — best-effort chain:
        // order -> pharmacyId -> subaccount. Any failure anywhere in this
        // chain degrades to "no subaccount" (null), never blocks checkout —
        // see OrderClient.getPharmacyId/PharmacyClient.getSubaccount javadoc.
        String subaccountCode = resolveSubaccountCode(request.getOrderId());

        PaystackClient.InitializeResult result = paystackClient.initializeTransaction(
                request.getEmail(), amountPesewas, payment.getOurReference(), callbackUrl, subaccountCode);

        if (!result.ok()) {
            payment.setStatus(Payment.Status.FAILED);
            paymentRepository.save(payment);
            throw new RuntimeException("Could not start Paystack transaction: " + result.message());
        }

        payment.setAuthorizationUrl(result.authorizationUrl());
        payment.setSubaccountCode(subaccountCode);
        return paymentRepository.save(payment);
    }

    private String resolveSubaccountCode(String orderId) {
        try {
            Optional<String> pharmacyId = orderClient.getPharmacyId(orderId);
            if (pharmacyId.isEmpty()) {
                log.info("No pharmacyId resolved for order {} — checkout proceeds with no payment split", orderId);
                return null;
            }
            Optional<String> subaccountCode = pharmacyClient.getSubaccount(pharmacyId.get());
            if (subaccountCode.isEmpty()) {
                log.info("Pharmacy {} has no active Paystack subaccount — checkout proceeds with no payment split", pharmacyId.get());
                return null;
            }
            return subaccountCode.get();
        } catch (RuntimeException e) {
            log.warn("Subaccount resolution failed for order {} — checkout proceeds with no payment split: {}", orderId, e.getMessage());
            return null;
        }
    }

    /**
     * Confirms a transaction directly against Paystack (never trusts the
     * caller's claim of success/failure) and, only on a genuine gateway
     * success with a matching amount, tells order-service to mark the order
     * paid via OrderClient. This is the ONLY path in the whole system that
     * can flip an order to PAID now — replaces order-service's old
     * unconditional fake flip.
     */
    public Payment verify(String reference) {
        Payment payment = paymentRepository.findByOurReference(reference)
                .orElseThrow(() -> new RuntimeException("Payment not found for reference " + reference));

        // Already resolved (verify can be called more than once safely —
        // e.g. the WebView callback fires and the user also taps a manual
        // "check status" button) — don't re-call Paystack or re-notify
        // order-service.
        if (payment.getStatus() != Payment.Status.PENDING) {
            return payment;
        }

        PaystackClient.VerifyResult result = paystackClient.verifyTransaction(reference);

        boolean success = result.ok()
                && "success".equals(result.gatewayStatus())
                && result.amountPesewas() == payment.getAmountPesewas()
                && "GHS".equals(result.currency());

        payment.setStatus(success ? Payment.Status.SUCCESS : Payment.Status.FAILED);
        payment = paymentRepository.save(payment);

        orderClient.markPaymentResult(payment.getOrderId(), success);
        return payment;
    }

    public Payment getById(String paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }

    public Payment getByReference(String reference) {
        return paymentRepository.findByOurReference(reference)
                .orElseThrow(() -> new RuntimeException("Payment not found for reference " + reference));
    }

    public List<Payment> getForOrder(String orderId) {
        return paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    // Phase 2 ownership-check support, same pattern as order-service's
    // getOrderOwnerId — null (not an exception) on a missing id so the
    // controller can return a plain 404 instead of conflating "doesn't
    // exist" with "forbidden".
    public String getPaymentOwnerId(String paymentId) {
        return paymentRepository.findById(paymentId).map(Payment::getUserId).orElse(null);
    }

    public String getOwnerIdByReference(String reference) {
        return paymentRepository.findByOurReference(reference).map(Payment::getUserId).orElse(null);
    }
}
