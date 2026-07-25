package com.pharmalink.delivery_service.controller;

import com.pharmalink.delivery_service.model.DriverRating;
import com.pharmalink.delivery_service.security.AuthContext;
import com.pharmalink.delivery_service.service.DriverRatingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Roadmap: "Rate driver after delivery". Routes live under
 * /api/delivery/{deliveryId}/rating, alongside the rest of this service's
 * per-delivery endpoints in DeliveryController. Ownership is always checked
 * against the delivery's own userId (the customer who placed the order) —
 * mirrors DeliveryController's checkAssignedDriverOrAdmin pattern, but for
 * "is this the customer" instead of "is this the assigned driver".
 */
@RestController
@RequestMapping("/api/delivery")
public class DriverRatingController {

    private final DriverRatingService driverRatingService;

    public DriverRatingController(DriverRatingService driverRatingService) {
        this.driverRatingService = driverRatingService;
    }

    @PostMapping("/{deliveryId}/rating")
    public ResponseEntity<?> submitRating(
            @PathVariable String deliveryId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        Object ratingRaw = body.get("rating");
        if (!(ratingRaw instanceof Number)) {
            return ResponseEntity.badRequest().body(Map.of("message", "rating is required"));
        }
        String comment = (String) body.get("comment");

        try {
            DriverRating saved = driverRatingService.submitRating(
                    deliveryId, userId, ((Number) ratingRaw).intValue(), comment);
            return ResponseEntity.ok(saved);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{deliveryId}/rating")
    public ResponseEntity<?> getRating(@PathVariable String deliveryId, HttpServletRequest request) {
        String ownerId = driverRatingService.getDeliveryOwnerId(deliveryId);
        if (ownerId == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Delivery not found"));
        }
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) {
            return ResponseEntity.status(403).body(Map.of("message", "You may only view your own rating"));
        }

        DriverRating rating = driverRatingService.getRatingForDelivery(deliveryId);
        if (rating == null) {
            return ResponseEntity.ok(java.util.Collections.singletonMap("rating", null));
        }
        return ResponseEntity.ok(rating);
    }
}
