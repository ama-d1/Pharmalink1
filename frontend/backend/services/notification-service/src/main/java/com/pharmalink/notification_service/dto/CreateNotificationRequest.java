package com.pharmalink.notification_service.dto;

import com.pharmalink.notification_service.model.Notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateNotificationRequest {

    @NotBlank
    private String userId;

    @NotNull
    private Notification.Type type;

    @NotBlank
    private String title;

    @NotBlank
    private String body;

    private String relatedEntityId;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Notification.Type getType() { return type; }
    public void setType(Notification.Type type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(String relatedEntityId) { this.relatedEntityId = relatedEntityId; }
}
