package com.pharmalink.chat_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Moved from the monolith's model/Conversation.java, plus one addition:
 * lastMessagePreview. Fixes BACKEND_TODO.md's flagged gap — the model
 * couldn't show a real conversation preview (last message content) before,
 * only lastMessageAt (a timestamp with no content). Set alongside
 * lastMessageAt in ChatService.sendMessage(), truncated to a safe length.
 *
 * "Other participant name" (the other flagged half of that gap) is NOT
 * stored here — it depends on which side of the conversation the requesting
 * user is on, so it's computed per-request in ChatService.getConversationsForUser()
 * via a call to user-profile-service, not persisted.
 */
@Entity
@Table(name = "conversations", indexes = {
    @Index(name = "idx_conv_patient",     columnList = "patientId"),
    @Index(name = "idx_conv_pharmacist",  columnList = "pharmacistId"),
    @Index(name = "idx_conv_driver",      columnList = "driverId")
})
public class Conversation {

    private static final int PREVIEW_MAX_LENGTH = 120;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String patientId;

    // Nullable now — a driver-conversation row (patientId + driverId) has no
    // pharmacistId. Added 2026-07-24 alongside driverId below.
    private String pharmacistId;

    // Added 2026-07-24 for patient<->driver chat. Exactly one of
    // pharmacistId/driverId is set per row (never both, never neither) —
    // ChatService's isParticipant()/otherParticipantId() treat whichever is
    // non-null as "the other side" of the patientId column.
    private String driverId;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastMessageAt;

    @Column(length = PREVIEW_MAX_LENGTH)
    private String lastMessagePreview;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastMessageAt = LocalDateTime.now();
    }

    public Conversation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPharmacistId() { return pharmacistId; }
    public void setPharmacistId(String pharmacistId) { this.pharmacistId = pharmacistId; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public String getLastMessagePreview() { return lastMessagePreview; }

    public void setLastMessagePreview(String content) {
        if (content == null) {
            this.lastMessagePreview = null;
        } else if (content.length() > PREVIEW_MAX_LENGTH) {
            this.lastMessagePreview = content.substring(0, PREVIEW_MAX_LENGTH - 1) + "…";
        } else {
            this.lastMessagePreview = content;
        }
    }
}
