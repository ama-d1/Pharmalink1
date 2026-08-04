package com.pharmalink.delivery_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A delivery request/tracking record. NOT backed by any real courier/driver
 * dispatch system — there is no driver network, no live GPS tracking, and
 * no third-party logistics API integrated. This mirrors the same honesty
 * standard already applied to order-service's payment stub
 * (OrderService.processPayment() javadoc): {@code driverName}/
 * {@code driverPhone} stay null until something real assigns them (there is
 * currently nothing that does), rather than being auto-populated with fake
 * data to look more complete than it is. Which real courier/logistics
 * integration to build (an in-house driver app? a third-party dispatch API?)
 * is a business decision, not something to guess at here.
 */
@Entity
@Table(name = "deliveries", indexes = {
    @Index(name = "idx_delivery_user",            columnList = "userId"),
    @Index(name = "idx_delivery_tracking_number",  columnList = "trackingNumber", unique = true),
    @Index(name = "idx_delivery_order",            columnList = "orderId")
})
public class Delivery {

    public enum DeliverySpeed { STANDARD, EXPRESS, PRIORITY }

    public enum DeliveryStatus { PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String orderId;

    // Resolved via a call to order-service at creation time (the frontend's
    // DeliveryRequest doesn't carry a userId at all) — see OrderClient.
    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliverySpeed deliverySpeed;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    private double estimatedFee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryStatus status = DeliveryStatus.PENDING;

    // Added 2026-07-23 for the real driver-assignment flow: a DRIVER-role
    // account (see auth-service's User.Role) claims this delivery via
    // POST /{id}/accept. driverName/driverPhone (already existed, always
    // null before this) get filled in at that moment — supplied by the
    // frontend from the driver's own profile rather than a second
    // service-to-service call, since they're display-only convenience
    // fields, not used for any authorization decision (driverId, resolved
    // server-side from the caller's own forwarded identity, is what's
    // actually checked).
    private String driverId;

    private String driverName;
    private String driverPhone;
    private LocalDateTime estimatedArrival;

    // Added 2026-07-23 — live location, updated by the assigned driver's app
    // via polling (POST /{id}/location), read by the customer's tracking
    // screen via polling (GET /track/{trackingNumber}). Null until a driver
    // has accepted and started sending updates. No WebSocket — this project
    // deliberately uses polling for location updates (simpler to build/
    // debug, "good enough" for a delivery ETA of minutes, not seconds).
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime locationUpdatedAt;

    @Column(nullable = false, unique = true)
    private String trackingNumber;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Delivery() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public DeliverySpeed getDeliverySpeed() { return deliverySpeed; }
    public void setDeliverySpeed(DeliverySpeed deliverySpeed) { this.deliverySpeed = deliverySpeed; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public double getEstimatedFee() { return estimatedFee; }
    public void setEstimatedFee(double estimatedFee) { this.estimatedFee = estimatedFee; }

    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getDriverPhone() { return driverPhone; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public Double getCurrentLatitude() { return currentLatitude; }
    public void setCurrentLatitude(Double currentLatitude) { this.currentLatitude = currentLatitude; }

    public Double getCurrentLongitude() { return currentLongitude; }
    public void setCurrentLongitude(Double currentLongitude) { this.currentLongitude = currentLongitude; }

    public LocalDateTime getLocationUpdatedAt() { return locationUpdatedAt; }
    public void setLocationUpdatedAt(LocalDateTime locationUpdatedAt) { this.locationUpdatedAt = locationUpdatedAt; }

    public LocalDateTime getEstimatedArrival() { return estimatedArrival; }
    public void setEstimatedArrival(LocalDateTime estimatedArrival) { this.estimatedArrival = estimatedArrival; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
