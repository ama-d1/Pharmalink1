package com.pharmalink.chat_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Moved as-is from the monolith's model/Message.java — no field changes.
@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_message_conversation", columnList = "conversationId"),
    @Index(name = "idx_message_sender",       columnList = "senderId")
})
public class Message {

    public enum MessageType { TEXT, AUDIO, VIDEO }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String conversationId;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private MessageType messageType = MessageType.TEXT;

    // Added 2026-07-24 for real voice-note/video-clip messages — was
    // unannotated before (defaulting to VARCHAR(255)), which is far too
    // small to hold a base64 data URI for even a few seconds of audio, let
    // alone video. Same "store as a data URI directly in Postgres" approach
    // already used for pharmacy stock photos (see PharmacyStock.imageBase64
    // javadoc) — no object storage/CDN account exists in this system, so
    // this is the pragmatic choice for now, same documented tradeoff.
    @Column(columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(updatable = false)
    private LocalDateTime sentAt;

    @Column(name = "read_status")
    private boolean readStatus = false;

    @PrePersist
    protected void onCreate() {
        sentAt = LocalDateTime.now();
    }

    public Message() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public MessageType getMessageType() { return messageType; }
    public void setMessageType(MessageType messageType) { this.messageType = messageType; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public boolean isReadStatus() { return readStatus; }
    public void setReadStatus(boolean readStatus) { this.readStatus = readStatus; }
}
