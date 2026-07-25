package com.pharmalink.chat_service.dto;

import java.time.LocalDateTime;

/**
 * New — closes BACKEND_TODO.md's flagged gap: "Conversation model/DTO
 * doesn't expose the other participant's name or a last-message preview".
 * otherParticipantId/otherParticipantName are computed per-request in
 * ChatService (depend on which side of the conversation the requesting
 * user is on), not stored on the entity itself.
 */
public class ConversationResponse {
    private String id;
    private String patientId;
    private String pharmacistId;
    private String otherParticipantId;
    private String otherParticipantName;
    private String lastMessagePreview;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPharmacistId() { return pharmacistId; }
    public void setPharmacistId(String pharmacistId) { this.pharmacistId = pharmacistId; }

    public String getOtherParticipantId() { return otherParticipantId; }
    public void setOtherParticipantId(String otherParticipantId) { this.otherParticipantId = otherParticipantId; }

    public String getOtherParticipantName() { return otherParticipantName; }
    public void setOtherParticipantName(String otherParticipantName) { this.otherParticipantName = otherParticipantName; }

    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }

    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
