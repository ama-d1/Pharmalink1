package com.pharmalink.order_service.dto;

import java.util.List;

// Moved as-is from the monolith's dto/OrderRequest.java.
public class OrderRequest {
    private String userId;
    private List<ItemDto> items;
    private String deliveryAddress;
    private String paymentMethod;
    // Added 2026-07-23 for the multi-pharmacy price-comparison rebuild —
    // nullable/optional for backward compat with any not-yet-migrated
    // frontend call sites.
    private String pharmacyId;

    // Added 2026-07-23 for the delivery-vs-pickup checkout choice — "PICKUP"
    // or "DELIVERY" (matches DrugOrder.FulfillmentType), optional/nullable
    // for backward compat (falls back to DELIVERY, the entity's default).
    private String fulfillmentType;

    // The delivery portion only — 0/omitted for PICKUP. Combined into
    // totalAmount server-side (see OrderService.createOrder), not summed on
    // top of it a second time.
    private double deliveryFee;

    public static class ItemDto {
        private String drugName;
        private int quantity;
        private double unitPrice;

        public String getDrugName() { return drugName; }
        public void setDrugName(String drugName) { this.drugName = drugName; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public double getUnitPrice() { return unitPrice; }
        public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public List<ItemDto> getItems() { return items; }
    public void setItems(List<ItemDto> items) { this.items = items; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(String pharmacyId) { this.pharmacyId = pharmacyId; }
    public String getFulfillmentType() { return fulfillmentType; }
    public void setFulfillmentType(String fulfillmentType) { this.fulfillmentType = fulfillmentType; }
    public double getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(double deliveryFee) { this.deliveryFee = deliveryFee; }
}
