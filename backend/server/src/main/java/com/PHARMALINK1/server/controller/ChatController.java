package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.MessageRequest;
import com.PHARMALINK1.server.dto.PharmacistSearchResponse;
import com.PHARMALINK1.server.model.Conversation;
import com.PHARMALINK1.server.model.Message;
import com.PHARMALINK1.server.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/conversation/start")
    public ResponseEntity<Conversation> startConversation(
            @RequestParam String patientId,
            @RequestParam String pharmacistId) {
        return ResponseEntity.ok(chatService.startConversation(patientId, pharmacistId));
    }

    @PostMapping("/message/send")
    public ResponseEntity<Message> sendMessage(@Valid @RequestBody MessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(request));
    }

    @GetMapping("/messages/{conversationId}")
    public ResponseEntity<List<Message>> getMessages(@PathVariable String conversationId) {
        return ResponseEntity.ok(chatService.getMessages(conversationId));
    }

    @GetMapping("/conversations/{userId}")
    public ResponseEntity<List<Conversation>> getConversations(@PathVariable String userId) {
        return ResponseEntity.ok(chatService.getConversationsForUser(userId));
    }

    @GetMapping("/pharmacists/search")
    public ResponseEntity<List<PharmacistSearchResponse>> searchPharmacists(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String pharmacyId) {
        return ResponseEntity.ok(chatService.searchPharmacists(q, pharmacyId));
    }
}