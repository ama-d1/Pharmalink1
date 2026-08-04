package com.pharmalink.pharmacy_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Added 2026-07-23 for the "search a medication, compare prices across
 * nearby pharmacies, pick one, order" feature (Home screen's Order Meds
 * quick action rebuild). Before this, a medication had exactly one global
 * price (drug-catalog-service's DrugCatalog — id/name/description/price/
 * inStock, no pharmacy relationship at all) — there was no way to represent
 * "this pharmacy stocks this medication at this price" anywhere in the
 * system. This is that join.
 *
 * drugId/drugName are both stored (drugId as the real foreign reference to
 * drug-catalog-service's catalog, drugName denormalized) so the
 * price-comparison search endpoint can return a usable result without a
 * cross-service round-trip per row for display purposes — same denormalized-
 * copy pattern used for pharmacyName on user-profile-service's Profile.
 *
 * One row per (pharmacy, drug) pair, enforced by the unique constraint —
 * a pharmacist updates their own price/quantity for a drug rather than
 * creating duplicate rows.
 */
@Entity
@Table(name = "pharmacy_stock", uniqueConstraints = {
    @UniqueConstraint(name = "uq_stock_pharmacy_drug", columnNames = {"pharmacy_id", "drug_id"})
}, indexes = {
    @Index(name = "idx_stock_pharmacy", columnList = "pharmacy_id"),
    @Index(name = "idx_stock_drug_name", columnList = "drug_name")
})
public class PharmacyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "pharmacy_id", nullable = false)
    private String pharmacyId;

    @Column(name = "drug_id", nullable = false)
    private String drugId;

    @Column(name = "drug_name", nullable = false)
    private String drugName;

    @Column(nullable = false)
    private double price;

    @Column(nullable = false)
    private int quantity;

    // Added 2026-07-23 — a data: URI (base64-encoded image, e.g.
    // "data:image/jpeg;base64,...") rather than a hosted URL, since this
    // project has no cloud image storage (S3/Cloudinary) set up yet. Stored
    // as TEXT (see V4__add_stock_image.sql) since Postgres's default varchar
    // limit is far too small for an encoded photo. Nullable — plenty of
    // stock rows will have no photo, that's fine, the UI shows a placeholder.
    // Revisit if this ever needs to scale past a handful of images per
    // pharmacy: base64-in-Postgres bloats the database and is slower to
    // serve than a real CDN-backed URL.
    @Column(columnDefinition = "TEXT")
    private String imageBase64;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public PharmacyStock() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }

    public String getDrugId() { return drugId; }
    public void setDrugId(String drugId) { this.drugId = drugId; }

    public String getDrugName() { return drugName; }
    public void setDrugName(String drugName) { this.drugName = drugName; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

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
