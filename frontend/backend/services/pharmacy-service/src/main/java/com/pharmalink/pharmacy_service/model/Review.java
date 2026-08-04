package com.pharmalink.pharmacy_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Coming-soon roadmap item #2 (COMING_SOON_ROADMAP.md): "Pharmacy reviews &
 * ratings". Shipped open (no "must have ordered here first" gate) — orders
 * in this system aren't scoped to a specific pharmacy at all (DrugOrder has
 * no pharmacyId), so a purchase-verification requirement isn't actually
 * enforceable today. Decided 2026-07-22: one review per user per pharmacy
 * (enforced by the unique constraint below), editable/deletable only by its
 * author (or an admin).
 */
@Entity
@Table(name = "reviews", uniqueConstraints = {
    @UniqueConstraint(name = "uq_review_pharmacy_user", columnNames = {"pharmacy_id", "user_id"})
}, indexes = {
    @Index(name = "idx_review_pharmacy", columnList = "pharmacy_id")
})
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "pharmacy_id", nullable = false)
    private String pharmacyId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private int rating; // 1-5, validated in ReviewService before save

    @Column(length = 1000)
    private String comment;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Review() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }

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
