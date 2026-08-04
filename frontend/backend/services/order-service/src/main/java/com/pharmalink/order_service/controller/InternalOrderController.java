package com.pharmalink.order_service.controller;

import com.pharmalink.order_service.model.DrugOrder;
import com.pharmalink.order_service.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Service-to-service only — backs admin-service's order oversight screen.
 * "All orders across all users" is admin-only data; living under
 * /api/orders/** (public, gateway-routed, permitAll at this service's own
 * SecurityConfig) would let any authenticated user enumerate every order
 * in the system. No gateway route exists for /internal/**, so this is
 * unreachable from outside — same convention as every other internal
 * endpoint in this system.
 */
@RestController
@RequestMapping("/internal/orders")
public class InternalOrderController {

    private final OrderService orderService;

    public InternalOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<DrugOrder>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    /**
     * NEW (2026-07-23) — called only by payment-service's OrderClient, only
     * after it has independently verified a transaction directly against
     * Paystack. This is the one and only real path that flips an order to
     * PAID now; see OrderService.markPaymentResult()'s javadoc.
     */
    @PatchMapping("/{orderId}/payment-result")
    public ResponseEntity<DrugOrder> markPaymentResult(@PathVariable String orderId, @RequestBody Map<String, Boolean> body) {
        boolean paid = Boolean.TRUE.equals(body.get("paid"));
        return ResponseEntity.ok(orderService.markPaymentResult(orderId, paid));
    }

    /**
     * NEW (2026-07-24) — called by payment-service's OrderClient at checkout
     * time to resolve which pharmacy an order belongs to, so the Paystack
     * split (subaccount) can be applied. Minimal projection, not the full
     * DrugOrder — payment-service only needs pharmacyId/userId/totalAmount.
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrder(@PathVariable String orderId) {
        DrugOrder order;
        try {
            order = orderService.getOrderById(orderId);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("pharmacyId", order.getPharmacyId());
        result.put("userId", order.getUserId());
        result.put("totalAmount", order.getTotalAmount());
        return ResponseEntity.ok(result);
    }
}
