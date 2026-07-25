package com.pharmalink.payment_service.controller;

import com.pharmalink.payment_service.dto.InitializePaymentRequest;
import com.pharmalink.payment_service.model.Payment;
import com.pharmalink.payment_service.security.AuthContext;
import com.pharmalink.payment_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initialize")
    public ResponseEntity<?> initialize(@Valid @RequestBody InitializePaymentRequest request, HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, request.getUserId())) return forbidden();
        try {
            Payment payment = paymentService.initialize(request);
            return ResponseEntity.ok(Map.of(
                    "paymentId", payment.getId(),
                    "reference", payment.getOurReference(),
                    "authorizationUrl", payment.getAuthorizationUrl(),
                    "status", payment.getStatus()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(502).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/verify/{reference}")
    public ResponseEntity<?> verify(@PathVariable String reference, HttpServletRequest httpRequest) {
        String ownerId = paymentService.getOwnerIdByReference(reference);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        try {
            return ResponseEntity.ok(paymentService.verify(reference));
        } catch (RuntimeException e) {
            return ResponseEntity.status(502).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(@PathVariable String paymentId, HttpServletRequest httpRequest) {
        String ownerId = paymentService.getPaymentOwnerId(paymentId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(httpRequest, ownerId)) return forbidden();
        return ResponseEntity.ok(paymentService.getById(paymentId));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getForOrder(@PathVariable String orderId, HttpServletRequest httpRequest) {
        List<Payment> payments = paymentService.getForOrder(orderId);
        if (!payments.isEmpty() && !AuthContext.isOwnerOrAdmin(httpRequest, payments.get(0).getUserId())) {
            return forbidden();
        }
        return ResponseEntity.ok(payments);
    }

    /**
     * Paystack's hosted checkout page redirects the WebView here after the
     * user finishes paying (see PaymentService.initialize's callback_url
     * comment). No JWT is present on this navigation — it's a redirect from
     * Paystack's own domain, not an authenticated API call from our app — so
     * this is deliberately permitAll (see SecurityConfig) and does its own
     * best-effort verification server-side as defense in depth, on top of
     * the app's own explicit call to /verify/{reference} once it detects
     * this navigation and closes the WebView.
     */
    @GetMapping(value = "/callback/{reference}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(@PathVariable String reference) {
        try {
            paymentService.verify(reference);
        } catch (RuntimeException ignored) {
            // Best-effort only — the app's own /verify call is authoritative
            // and will surface any real error to the user.
        }
        return ResponseEntity.ok("<html><body><h3>Payment complete</h3><p>You can close this window.</p></body></html>");
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Payment service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
    }
}
