package com.pharmalink.delivery_service.controller;

import com.pharmalink.delivery_service.dto.DeliveryRequest;
import com.pharmalink.delivery_service.model.Delivery;
import com.pharmalink.delivery_service.security.AuthContext;
import com.pharmalink.delivery_service.service.DeliveryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Routes match frontend/services/deliveryService.ts exactly — that file
// (and frontend/app/delivery.tsx) were already built against this contract
// before this service existed; every call previously 404'd.
//
// Phase 2 (step 8): SecurityException from DeliveryService's ownership
// checks maps to 403 here; RuntimeException (not-found, bad speed, etc.)
// keeps its prior status codes.
@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;

    public DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestDelivery(@RequestBody DeliveryRequest request, HttpServletRequest httpRequest) {
        try {
            Delivery delivery = deliveryService.requestDelivery(
                    request, AuthContext.currentUserId(httpRequest), AuthContext.isAdmin(httpRequest));
            return ResponseEntity.ok(delivery);
        } catch (SecurityException e) {
            return forbidden(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/track/{trackingNumber}")
    public ResponseEntity<?> trackDelivery(@PathVariable String trackingNumber, HttpServletRequest httpRequest) {
        try {
            Delivery delivery = deliveryService.trackDelivery(
                    trackingNumber, AuthContext.currentUserId(httpRequest), AuthContext.isAdmin(httpRequest));
            return ResponseEntity.ok(delivery);
        } catch (SecurityException e) {
            return forbidden(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<?> getDeliveryHistory(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden("You may only access your own data");
        return ResponseEntity.ok(deliveryService.getDeliveryHistory(userId));
    }

    @PostMapping("/{deliveryId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelDelivery(@PathVariable String deliveryId, HttpServletRequest httpRequest) {
        try {
            deliveryService.cancelDelivery(
                    deliveryId, AuthContext.currentUserId(httpRequest), AuthContext.isAdmin(httpRequest));
            return ResponseEntity.ok(Map.of("success", true, "message", "Delivery cancelled"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Driver assignment (added 2026-07-23) ────────────────────────────────

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableDeliveries(HttpServletRequest request) {
        if (!AuthContext.isDriver(request) && !AuthContext.isAdmin(request)) return forbidden("Only drivers can view available deliveries");
        return ResponseEntity.ok(deliveryService.getAvailableDeliveries());
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getDriverDeliveries(@PathVariable String driverId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, driverId)) return forbidden("You may only access your own deliveries");
        return ResponseEntity.ok(deliveryService.getDriverDeliveries(driverId));
    }

    // Accepting is the "first to tap wins" race — see
    // DeliveryRepository.claimDelivery's javadoc. driverName/driverPhone in
    // the body are display-only convenience fields the frontend already has
    // from the driver's own profile — driverId itself comes from the
    // caller's own forwarded identity, never trusted from the body.
    @PostMapping("/{deliveryId}/accept")
    public ResponseEntity<?> acceptDelivery(@PathVariable String deliveryId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!AuthContext.isDriver(request)) return forbidden("Only drivers can accept deliveries");
        String driverId = AuthContext.currentUserId(request);
        if (driverId == null) return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));

        try {
            Delivery delivery = deliveryService.acceptDelivery(deliveryId, driverId, body.get("driverName"), body.get("driverPhone"));
            return ResponseEntity.ok(delivery);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{deliveryId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String deliveryId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        ResponseEntity<?> denied = checkAssignedDriverOrAdmin(request, deliveryId);
        if (denied != null) return denied;

        try {
            Delivery.DeliveryStatus newStatus = Delivery.DeliveryStatus.valueOf(String.valueOf(body.get("status")).toUpperCase());
            return ResponseEntity.ok(deliveryService.updateStatus(deliveryId, newStatus));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unknown status: " + body.get("status")));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{deliveryId}/location")
    public ResponseEntity<?> updateLocation(@PathVariable String deliveryId, @RequestBody Map<String, Double> body, HttpServletRequest request) {
        ResponseEntity<?> denied = checkAssignedDriverOrAdmin(request, deliveryId);
        if (denied != null) return denied;

        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) return ResponseEntity.badRequest().body(Map.of("message", "latitude and longitude are required"));

        try {
            return ResponseEntity.ok(deliveryService.updateLocation(deliveryId, lat, lng));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<?> checkAssignedDriverOrAdmin(HttpServletRequest request, String deliveryId) {
        if (AuthContext.isAdmin(request)) return null;
        if (!AuthContext.isDriver(request)) return forbidden("Only the assigned driver can update this delivery");

        String callerId = AuthContext.currentUserId(request);
        String assignedDriverId = deliveryService.getDeliveryDriverId(deliveryId);
        if (assignedDriverId == null) return ResponseEntity.status(404).body(Map.of("message", "Delivery not found"));
        if (!assignedDriverId.equals(callerId)) return forbidden("You are not the driver assigned to this delivery");
        return null;
    }

    @GetMapping("/calculate-fee")
    public ResponseEntity<?> calculateFee(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String speed) {
        try {
            return ResponseEntity.ok(deliveryService.calculateFee(from, to, speed));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Delivery service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden(String message) {
        return ResponseEntity.status(403).body(Map.of("message", message));
    }
}
