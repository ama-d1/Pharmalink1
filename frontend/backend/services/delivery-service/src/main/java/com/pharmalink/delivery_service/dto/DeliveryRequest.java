package com.pharmalink.delivery_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Mirrors frontend/services/deliveryService.ts's DeliveryRequest exactly —
// that file was already built against this contract before this service
// existed, so the field names/casing here are not a free choice.
public class DeliveryRequest {

    @NotBlank
    private String orderId;

    @NotNull
    private String deliverySpeed; // "standard" | "express" | "priority" (lowercase from frontend)

    @NotBlank
    private String address;

    @NotBlank
    private String phoneNumber;

    private String instructions;

    private double estimatedFee;

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getDeliverySpeed() { return deliverySpeed; }
    public void setDeliverySpeed(String deliverySpeed) { this.deliverySpeed = deliverySpeed; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public double getEstimatedFee() { return estimatedFee; }
    public void setEstimatedFee(double estimatedFee) { this.estimatedFee = estimatedFee; }
}
