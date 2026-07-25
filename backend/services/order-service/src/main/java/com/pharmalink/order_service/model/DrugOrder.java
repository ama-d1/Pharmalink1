package com.pharmalink.order_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Moved as-is from the monolith's model/DrugOrder.java — no field changes.
// NOTE: paymentStatus/orderStatus transitions are still fake — see
// OrderService.processPayment() javadoc and BACKEND_TODO.md. No real
// payment gateway (Paystack/Stripe/MTN MoMo) is wired up; that's a business
// decision (which gateway, whose merchant account) that needs your input,
// not something to guess at during a structural extraction.
@Entity
@Table(name = "drug_orders")
public class DrugOrder {

    public enum OrderStatus { PENDING, CONFIRMED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED }
    public enum PaymentStatus { UNPAID, PAID, REFUNDED }

    // Added 2026-07-23 — the delivery-vs-pickup choice now happens at
    // checkout, BEFORE payment (see frontend/app/checkout-fulfillment.tsx),
    // not as a separate step the user is prompted into after paying. DELIVERY
    // is the default for backward compatibility with any pre-existing orders
    // created before this column existed (they were all effectively
    // deliveries, since pickup wasn't an option yet).
    public enum FulfillmentType { PICKUP, DELIVERY }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    // Added 2026-07-23 for the multi-pharmacy price-comparison "Order Meds"
    // rebuild — previously an order had NO pharmacy relationship at all
    // (see this class's old javadoc note and pharmacy-service's
    // PharmacyStock entity javadoc for the full history). Nullable for
    // backward compatibility with any pre-existing orders created before
    // this column existed; new orders from the rebuilt flow always set it,
    // since the whole point is picking ONE pharmacy per order (like a food
    // delivery app — you don't split one order across two restaurants).
    @Column(name = "pharmacy_id")
    private String pharmacyId;

    // FIXED (2026-07-24) — @ElementCollection defaults to FetchType.LAZY.
    // This service has spring.jpa.open-in-view: false (see
    // application.yaml), so once a repository call like findById() returns,
    // the Hibernate session it used is closed — there's no still-open
    // session left for a later, un-triggered lazy load of `items` to fall
    // back on. Every method here that returns a DrugOrder straight from the
    // repository (getOrderById, getUserOrders, getAllOrders,
    // getOrdersForPharmacy) hands it to the controller, which returns it
    // as-is for Jackson to serialize — by which point the transaction has
    // long since ended. Accessing `items` at that point throws
    // LazyInitializationException, which Spring wraps as
    // HttpMessageNotWritableException while writing the HTTP response body
    // (visible in order-service's own logs as exactly that, for
    // GET /api/orders/{orderId} — the call delivery-service makes to
    // resolve an order's owner before creating a delivery). Since an order
    // is never meaningfully used without its items, EAGER is the simple,
    // correct fix here — not a scoped-down @Transactional +
    // forced-initialization on just one method, since every read path
    // above has the identical landmine.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_items", joinColumns = @JoinColumn(name = "order_id"))
    private List<OrderItem> items = new ArrayList<>();

    private double totalAmount;
    private String deliveryAddress;
    private String paymentMethod;

    // Added 2026-07-23 — see FulfillmentType javadoc above.
    @Enumerated(EnumType.STRING)
    private FulfillmentType fulfillmentType = FulfillmentType.DELIVERY;

    // Added 2026-07-23 — the delivery portion of totalAmount, broken out so
    // the order/payment summary can show "drugs" vs "delivery" separately
    // instead of one opaque number. 0 for PICKUP orders. totalAmount itself
    // already includes this (drugs + deliveryFee), it's not added on top.
    private double deliveryFee = 0;

    @Enumerated(EnumType.STRING)
    private OrderStatus orderStatus = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Embeddable
    public static class OrderItem {
        private String drugName;
        private int quantity;
        private double unitPrice;

        public OrderItem() {}

        public OrderItem(String drugName, int quantity, double unitPrice) {
            this.drugName = drugName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public String getDrugName() { return drugName; }
        public void setDrugName(String drugName) { this.drugName = drugName; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }

        public double getUnitPrice() { return unitPrice; }
        public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
    }

    public DrugOrder() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public FulfillmentType getFulfillmentType() { return fulfillmentType; }
    public void setFulfillmentType(FulfillmentType fulfillmentType) { this.fulfillmentType = fulfillmentType; }

    public double getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(double deliveryFee) { this.deliveryFee = deliveryFee; }

    public OrderStatus getOrderStatus() { return orderStatus; }
    public void setOrderStatus(OrderStatus orderStatus) { this.orderStatus = orderStatus; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
