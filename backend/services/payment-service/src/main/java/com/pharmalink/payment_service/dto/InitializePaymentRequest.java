package com.pharmalink.payment_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public class InitializePaymentRequest {

    @NotBlank
    private String orderId;

    @NotBlank
    private String userId;

    @Email
    @NotBlank
    private String email;

    // GHS, not pesewas — the frontend deals in normal currency amounts
    // (e.g. 45.50 GHS); PaymentService converts to pesewas before ever
    // talking to Paystack.
    @Positive
    private double amountGhs;

    public InitializePaymentRequest() {}

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public double getAmountGhs() { return amountGhs; }
    public void setAmountGhs(double amountGhs) { this.amountGhs = amountGhs; }
}
