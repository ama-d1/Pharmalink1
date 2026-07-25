package com.pharmalink.payment_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// New service, added 2026-07-23 for real Paystack integration (previously
// order-service's processPayment() just flipped a status flag with no
// gateway call at all — see order-service's OrderService javadoc and
// BACKEND_TODO.md "Payment" section for that history).
//
// amountPesewas is stored as a long (smallest GHS unit — 1 GHS = 100
// pesewas), not a double, because Paystack's API itself works in the
// smallest currency unit and floating point is the wrong type for money
// anywhere real verification/comparison happens.
//
// ourReference is a UUID WE generate up front and pass to Paystack as the
// transaction reference — this lets us look up a Payment by reference
// before Paystack ever calls us back, and makes retries of
// initializeTransaction() idempotent per order.
@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_order_id", columnList = "order_id"),
    @Index(name = "idx_payment_user_id", columnList = "user_id"),
    @Index(name = "idx_payment_reference", columnList = "our_reference", unique = true)
})
public class Payment {

    public enum Status { PENDING, SUCCESS, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "amount_pesewas", nullable = false)
    private long amountPesewas;

    @Column(nullable = false)
    private String currency = "GHS";

    @Column(name = "our_reference", nullable = false, unique = true)
    private String ourReference;

    private String authorizationUrl;

    // Added 2026-07-24 for real payment splitting — the pharmacy's Paystack
    // subaccount code, if one was resolved and applied to this transaction
    // (null means "no split, platform received 100%", either because the
    // pharmacy hasn't onboarded yet or the lookup chain failed best-effort).
    // Kept for reference/debugging, not used in any business logic here.
    @Column(name = "subaccount_code")
    private String subaccountCode;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Payment() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public long getAmountPesewas() { return amountPesewas; }
    public void setAmountPesewas(long amountPesewas) { this.amountPesewas = amountPesewas; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getOurReference() { return ourReference; }
    public void setOurReference(String ourReference) { this.ourReference = ourReference; }

    public String getAuthorizationUrl() { return authorizationUrl; }
    public void setAuthorizationUrl(String authorizationUrl) { this.authorizationUrl = authorizationUrl; }

    public String getSubaccountCode() { return subaccountCode; }
    public void setSubaccountCode(String subaccountCode) { this.subaccountCode = subaccountCode; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
