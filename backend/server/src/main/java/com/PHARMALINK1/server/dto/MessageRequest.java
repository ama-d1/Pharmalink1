package com.PHARMALINK1.server.dto;

import jakarta.validation.constraints.NotBlank;

public class MessageRequest {

    @NotBlank
    private String conversationId;

    @NotBlank
    private String senderId;

    @NotBlank
    private String content;

    public MessageRequest() {}

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}