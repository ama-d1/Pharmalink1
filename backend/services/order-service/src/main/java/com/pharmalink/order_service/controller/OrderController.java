package com.pharmalink.order_service.controller;

import com.pharmalink.order_service.client.ProfileClient;
import com.pharmalink.order_service.dto.OrderRequest;
import com.pharmalink.order_service.model.DrugOrder;
import com.pharmalink.order_service.security.AuthContext;
import com.pharmalink.order_service.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

// Moved as-is from the monolith's controller/OrderController.java, plus
// Phase 2 (step 8) ownership checks: /{orderId} and /{orderId}/pay resolve
// the order's owner first (OrderService.getOrderOwnerId(), returns null —
// not an exception — on a missing id so 404 and 403 stay distinct), and
// /user/{userId}/createOrder check the caller directly against the userId
// in the path/body.
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final ProfileClient profileClient;

    public OrderController(OrderService orderService, ProfileClient profileClient) {
        this.orderService = orderService;
        this.profileClient = profileClient;
    }

    @GetMapping("/drugs")
    public ResponseEntity<List<Map<String, Object>>> getDrugs() {
        return ResponseEntity.ok(orderService.getAvailableDrugs());
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request, HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, request.getUserId())) return forbidden();
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PostMapping("/{orderId}/pay")
    public ResponseEntity<?> pay(@PathVariable String orderId, HttpServletRequest request) {
        String ownerId = orderService.getOrderOwnerId(orderId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) return forbidden();
        return ResponseEntity.ok(orderService.processPayment(orderId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserOrders(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(orderService.getUserOrders(userId));
    }

    // NEW — added for delivery-service, which only receives an orderId from
    // the frontend (no userId) and needs to resolve ownership + delivery
    // address by looking the order up here. See MICROSERVICES_PLAN.md §6
    // step 7a. delivery-service now forwards the original caller's headers
    // (ForwardedHeadersInterceptor), so this check works the same whether
    // hit directly or via that internal hop.
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable String orderId, HttpServletRequest request) {
        String ownerId = orderService.getOrderOwnerId(orderId);
        if (ownerId == null) return ResponseEntity.notFound().build();
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) return forbidden();
        return ResponseEntity.ok(orderService.getOrderById(orderId));
    }

    // Added 2026-07-23 for the pharmacist owner/manager dashboard — a
    // pharmacy's own order history. Ownership check mirrors pharmacy-
    // service's checkPharmacyOwnership (admin bypass, else caller's own
    // Profile.pharmacyId must match the path pharmacyId).
    @GetMapping("/pharmacy/{pharmacyId}")
    public ResponseEntity<?> getOrdersForPharmacy(@PathVariable String pharmacyId, HttpServletRequest request) {
        ResponseEntity<?> denied = checkPharmacyOwnership(request, pharmacyId);
        if (denied != null) return denied;
        return ResponseEntity.ok(orderService.getOrdersForPharmacy(pharmacyId));
    }

    // Same dashboard, same ownership check — a lightweight count/revenue
    // summary so the pharmacist dashboard doesn't have to fetch and reduce
    // the full order list client-side just to show three numbers.
    @GetMapping("/pharmacy/{pharmacyId}/summary")
    public ResponseEntity<?> getPharmacyOrderSummary(@PathVariable String pharmacyId, HttpServletRequest request) {
        ResponseEntity<?> denied = checkPharmacyOwnership(request, pharmacyId);
        if (denied != null) return denied;
        return ResponseEntity.ok(orderService.getPharmacyOrderSummary(pharmacyId));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Order service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
    }

    private ResponseEntity<?> checkPharmacyOwnership(HttpServletRequest request, String pharmacyId) {
        if (AuthContext.isAdmin(request)) return null;

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        boolean ownsThisPharmacy = profileClient.getPharmacyIdForUser(userId)
                .map(pharmacyId::equals)
                .orElse(false);
        if (!ownsThisPharmacy) {
            return ResponseEntity.status(403).body(Map.of("message", "You may only view your own pharmacy's orders"));
        }
        return null;
    }
}
