package com.pharmalink.delivery_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Roadmap: "Rate driver after delivery". Mirrors pharmacy-service's Review
 * entity in style, but scoped per-delivery rather than per-lifetime-of-
 * relationship — a patient can rate a driver again after a different
 * completed delivery, so the unique constraint is on deliveryId, NOT on
 * (driverId, userId). Only creatable/updatable for a DELIVERED delivery
 * belonging to the rating user — enforced in DriverRatingService, not here.
 */
@Entity
@Table(name = "driver_ratings", uniqueConstraints = {
    @UniqueConstraint(name = "uq_driver_rating_delivery", columnNames = {"delivery_id"})
}, indexes = {
    @Index(name = "idx_driver_rating_driver", columnList = "driver_id")
})
public class DriverRating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "delivery_id", nullable = false)
    private String deliveryId;

    @Column(name = "driver_id", nullable = false)
    private String driverId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private int rating; // 1-5, validated in DriverRatingService before save

    @Column(length = 1000)
    private String comment;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public DriverRating() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDeliveryId() { return deliveryId; }
    public void setDeliveryId(String deliveryId) { this.deliveryId = deliveryId; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
