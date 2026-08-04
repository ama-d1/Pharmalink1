package com.pharmalink.notification_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_user", columnList = "userId"),
    @Index(name = "idx_notification_user_created_at", columnList = "userId, createdAt")
})
public class Notification {

    // ORDER_STATUS: produced by order-service on payment/status changes.
    // COMMUNITY_ACTIVITY: produced by community-service when someone
    // comments on your post (coming-soon roadmap item #3, see
    // COMING_SOON_ROADMAP.md and CommunityService.commentOnPost()).
    // APPOINTMENT_REMINDER: produced by user-profile-service's
    // AppointmentReminderScheduler 24h before a scheduled appointment
    // (coming-soon roadmap item #7).
    // CHAT_MESSAGE still has no producer wired — exists so the model is
    // ready when that gets built.
    public enum Type { ORDER_STATUS, CHAT_MESSAGE, COMMUNITY_ACTIVITY, APPOINTMENT_REMINDER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    // Free-form reference to whatever triggered this (e.g. an orderId) —
    // deliberately untyped since different producers reference different
    // entities; not a foreign key, just a display/deep-link hint.
    private String relatedEntityId;

    @Column(nullable = false)
    private boolean read = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Notification() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(String relatedEntityId) { this.relatedEntityId = relatedEntityId; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
