package com.pharmalink.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

public class TwoFactorVerifyRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "code is required")
    private String code;

    public TwoFactorVerifyRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
