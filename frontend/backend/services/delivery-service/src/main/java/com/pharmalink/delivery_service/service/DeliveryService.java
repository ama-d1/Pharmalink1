package com.pharmalink.delivery_service.service;

import com.pharmalink.delivery_service.client.OrderClient;
import com.pharmalink.delivery_service.dto.DeliveryRequest;
import com.pharmalink.delivery_service.model.Delivery;
import com.pharmalink.delivery_service.repository.DeliveryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderClient orderClient;

    public DeliveryService(DeliveryRepository deliveryRepository, OrderClient orderClient) {
        this.deliveryRepository = deliveryRepository;
        this.orderClient = orderClient;
    }

    public Delivery requestDelivery(DeliveryRequest request, String callerId, boolean callerIsAdmin) {
        // Resolve ownership via order-service — see OrderClient javadoc for
        // why this is not best-effort.
        Map<String, Object> order = orderClient.getOrder(request.getOrderId());
        String userId = (String) order.get("userId");
        if (userId == null) {
            throw new RuntimeException("Order " + request.getOrderId() + " has no owning user — cannot create delivery");
        }

        // Phase 2 (step 8): without this, anyone could request a delivery
        // against someone else's order just by knowing its orderId — the
        // request body never carried a userId of its own to check directly.
        if (!callerIsAdmin && !userId.equals(callerId)) {
            throw new SecurityException("Order " + request.getOrderId() + " does not belong to you");
        }

        Delivery.DeliverySpeed speed = parseSpeed(request.getDeliverySpeed());

        Delivery delivery = new Delivery();
        delivery.setOrderId(request.getOrderId());
        delivery.setUserId(userId);
        delivery.setDeliverySpeed(speed);
        delivery.setAddress(request.getAddress());
        delivery.setPhoneNumber(request.getPhoneNumber());
        delivery.setInstructions(request.getInstructions());
        delivery.setEstimatedFee(request.getEstimatedFee());
        delivery.setStatus(Delivery.DeliveryStatus.PENDING);
        delivery.setTrackingNumber(generateTrackingNumber());
        delivery.setEstimatedArrival(LocalDateTime.now().plusMinutes(etaMinutes(speed)));
        // driverName/driverPhone deliberately left null — see Delivery's
        // class javadoc. Nothing in this system assigns a real driver yet.

        return deliveryRepository.save(delivery);
    }

    public Delivery trackDelivery(String trackingNumber, String callerId, boolean callerIsAdmin) {
        Delivery delivery = deliveryRepository.findByTrackingNumber(trackingNumber)
            .orElseThrow(() -> new RuntimeException("No delivery found for tracking number " + trackingNumber));
        requireOwnerOrAdmin(delivery, callerId, callerIsAdmin);
        return delivery;
    }

    public List<Delivery> getDeliveryHistory(String userId) {
        return deliveryRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // ── Driver assignment (added 2026-07-23) ────────────────────────────────

    // The "notify all drivers, first to accept wins" pool — every PENDING
    // (unassigned) delivery, for any online DRIVER to browse and claim.
    public List<Delivery> getAvailableDeliveries() {
        return deliveryRepository.findByStatusOrderByCreatedAtDesc(Delivery.DeliveryStatus.PENDING);
    }

    public List<Delivery> getDriverDeliveries(String driverId) {
        return deliveryRepository.findByDriverIdOrderByCreatedAtDesc(driverId);
    }

    /**
     * Claims a delivery for the calling driver — see
     * DeliveryRepository.claimDelivery's javadoc for why this is a single
     * atomic conditional UPDATE rather than read-check-write. Throws (not a
     * boolean) so the controller can distinguish "doesn't exist" (404) from
     * "someone else already took it" (409) by checking existence only on
     * the failure path, not the success path.
     */
    public Delivery acceptDelivery(String deliveryId, String driverId, String driverName, String driverPhone) {
        int updated = deliveryRepository.claimDelivery(
                deliveryId, driverId, driverName, driverPhone,
                Delivery.DeliveryStatus.ASSIGNED, Delivery.DeliveryStatus.PENDING);
        if (updated == 0) {
            boolean exists = deliveryRepository.existsById(deliveryId);
            if (!exists) throw new RuntimeException("Delivery not found");
            throw new IllegalStateException("This delivery has already been accepted by another driver");
        }
        return deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));
    }

    // Forward-only progression (PICKED_UP -> IN_TRANSIT -> DELIVERED),
    // enforced by ordinal comparison — a driver can jump ahead (e.g.
    // straight to DELIVERED for a very short trip) but never move backward
    // or "un-deliver" something. Only the assigned driver (or admin) may
    // call this — see the controller's ownership check.
    public Delivery updateStatus(String deliveryId, Delivery.DeliveryStatus newStatus) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));

        if (delivery.getStatus() == Delivery.DeliveryStatus.CANCELLED
                || delivery.getStatus() == Delivery.DeliveryStatus.DELIVERED) {
            throw new IllegalStateException("Cannot update a delivery that is already " + delivery.getStatus());
        }
        if (newStatus.ordinal() <= delivery.getStatus().ordinal()) {
            throw new IllegalStateException("Cannot move delivery status backward (" + delivery.getStatus() + " -> " + newStatus + ")");
        }

        delivery.setStatus(newStatus);
        return deliveryRepository.save(delivery);
    }

    // Called by the assigned driver's app on a timer while a delivery is in
    // progress (polling, not a live socket — see Delivery's class javadoc on
    // currentLatitude/currentLongitude). No-ops are fine here; there's
    // nothing else waiting synchronously on a location update.
    public Delivery updateLocation(String deliveryId, double latitude, double longitude) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));
        delivery.setCurrentLatitude(latitude);
        delivery.setCurrentLongitude(longitude);
        delivery.setLocationUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    // Used by the controller's ownership check on status/location updates —
    // only the driver actually assigned to this delivery (or an admin) may
    // change it.
    public String getDeliveryDriverId(String deliveryId) {
        return deliveryRepository.findById(deliveryId).map(Delivery::getDriverId).orElse(null);
    }

    public Delivery cancelDelivery(String deliveryId, String callerId, boolean callerIsAdmin) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
            .orElseThrow(() -> new RuntimeException("Delivery not found"));
        requireOwnerOrAdmin(delivery, callerId, callerIsAdmin);

        if (delivery.getStatus() == Delivery.DeliveryStatus.DELIVERED
                || delivery.getStatus() == Delivery.DeliveryStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel a delivery that is already " + delivery.getStatus());
        }

        delivery.setStatus(Delivery.DeliveryStatus.CANCELLED);
        return deliveryRepository.save(delivery);
    }

    // Phase 2 ownership-check support (MICROSERVICES_PLAN.md §6 step 8).
    // Throws (rather than returning boolean) so callers can't accidentally
    // ignore a failed check — every call site here needs to either get a
    // Delivery back or stop, never proceed silently unauthorized.
    private void requireOwnerOrAdmin(Delivery delivery, String callerId, boolean callerIsAdmin) {
        if (!callerIsAdmin && !delivery.getUserId().equals(callerId)) {
            throw new SecurityException("This delivery does not belong to you");
        }
    }

    /**
     * Fee/ETA lookup mirrors the exact figures the frontend already
     * hardcodes per speed tier in delivery.tsx's deliveryOptions array
     * (standard ₵5.00/2-3h, express ₵15.00/45-60min, priority ₵25.00/
     * 20-30min) — not new numbers invented here, just the same business
     * logic made available as a server-side lookup for calculate-fee.
     * There's no real distance/geocoding calculation behind this (no
     * mapping API integrated); from/to addresses are accepted but not
     * currently used to vary the price.
     */
    public Map<String, Object> calculateFee(String fromAddress, String toAddress, String speed) {
        Delivery.DeliverySpeed parsedSpeed = parseSpeed(speed);
        double fee = baseFee(parsedSpeed);
        String estimatedTime = estimatedTimeLabel(parsedSpeed);
        return Map.of("fee", fee, "estimatedTime", estimatedTime);
    }

    private Delivery.DeliverySpeed parseSpeed(String speed) {
        try {
            return Delivery.DeliverySpeed.valueOf(speed.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new RuntimeException("Unknown delivery speed: " + speed);
        }
    }

    private double baseFee(Delivery.DeliverySpeed speed) {
        return switch (speed) {
            case STANDARD -> 5.00;
            case EXPRESS -> 15.00;
            case PRIORITY -> 25.00;
        };
    }

    private long etaMinutes(Delivery.DeliverySpeed speed) {
        return switch (speed) {
            case STANDARD -> 150L; // ~2.5h, midpoint of 2-3h
            case EXPRESS -> 52L;   // midpoint of 45-60min
            case PRIORITY -> 25L;  // midpoint of 20-30min
        };
    }

    private String estimatedTimeLabel(Delivery.DeliverySpeed speed) {
        return switch (speed) {
            case STANDARD -> "2-3 hours";
            case EXPRESS -> "45-60 minutes";
            case PRIORITY -> "20-30 minutes";
        };
    }

    private String generateTrackingNumber() {
        return "PL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
