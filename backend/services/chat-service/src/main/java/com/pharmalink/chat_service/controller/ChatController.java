package com.pharmalink.chat_service.controller;

import com.pharmalink.chat_service.dto.ConversationResponse;
import com.pharmalink.chat_service.dto.MessageRequest;
import com.pharmalink.chat_service.dto.PharmacistSearchResponse;
import com.pharmalink.chat_service.model.Conversation;
import com.pharmalink.chat_service.model.Message;
import com.pharmalink.chat_service.security.AuthContext;
import com.pharmalink.chat_service.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

// Moved from the monolith's controller/ChatController.java. Only real
// change: GET /conversations/{userId} now returns List<ConversationResponse>
// instead of List<Conversation> — same route, richer payload (adds
// otherParticipantId/otherParticipantName/lastMessagePreview). Frontend
// code reading the old Conversation shape by field name still gets
// patientId/pharmacistId/lastMessageAt/createdAt unchanged; it just also
// gets the new fields now.
//
// Phase 2 (step 8): conversations don't have a single "owner" — either
// participant (patientId or pharmacistId) is allowed to read/send. Checks
// use ChatService.isParticipant() after resolving the conversation (null
// means not-found, handled as 404 before the 403 check).
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/conversation/start")
    public ResponseEntity<?> startConversation(
            @RequestParam String patientId,
            @RequestParam String pharmacistId,
            HttpServletRequest request) {
        String callerId = AuthContext.currentUserId(request);
        boolean isCaller = patientId.equals(callerId) || pharmacistId.equals(callerId);
        if (!isCaller && !AuthContext.isAdmin(request)) return forbidden();
        return ResponseEntity.ok(chatService.startConversation(patientId, pharmacistId));
    }

    // Added 2026-07-24 — patient<->driver chat (contact-driver feature).
    // Same response shape as /conversation/start (the raw Conversation
    // entity) so the frontend can reuse the exact same parsing logic.
    @PostMapping("/conversation/start-driver-chat")
    public ResponseEntity<?> startDriverConversation(
            @RequestParam String patientId,
            @RequestParam String driverId,
            HttpServletRequest request) {
        String callerId = AuthContext.currentUserId(request);
        boolean isCaller = patientId.equals(callerId) || driverId.equals(callerId);
        if (!isCaller && !AuthContext.isAdmin(request)) return forbidden();
        return ResponseEntity.ok(chatService.startDriverConversation(patientId, driverId));
    }

    @PostMapping("/message/send")
    public ResponseEntity<?> sendMessage(@Valid @RequestBody MessageRequest request, HttpServletRequest httpRequest) {
        if (!AuthContext.isOwnerOrAdmin(httpRequest, request.getSenderId())) return forbidden();
        Conversation conversation = chatService.getConversationOrNull(request.getConversationId());
        if (conversation == null) return ResponseEntity.notFound().build();
        if (!chatService.isParticipant(conversation, request.getSenderId()) && !AuthContext.isAdmin(httpRequest)) {
            return forbidden();
        }
        // FIXED — this had no exception handling at all, unlike every other
        // mutating endpoint in the codebase (see e.g. user-profile-service's
        // ProfileController for the same gap, fixed the same way earlier
        // this session). Without it, any failure here — including the
        // WebSocket message-size-limit exception a voice note/video clip
        // used to hit (see WebSocketConfig's configureWebSocketTransport
        // javadoc) — fell through to Spring Boot's default /error handler,
        // which returns "message": "No message available"
        // (server.error.include-message defaults to "never" and was never
        // set here), leaving the frontend's error Alert with nothing useful
        // to show.
        try {
            return ResponseEntity.ok(chatService.sendMessage(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/messages/{conversationId}")
    public ResponseEntity<?> getMessages(@PathVariable String conversationId, HttpServletRequest request) {
        Conversation conversation = chatService.getConversationOrNull(conversationId);
        if (conversation == null) return ResponseEntity.notFound().build();
        String callerId = AuthContext.currentUserId(request);
        if (!chatService.isParticipant(conversation, callerId) && !AuthContext.isAdmin(request)) return forbidden();
        return ResponseEntity.ok(chatService.getMessages(conversationId));
    }

    @GetMapping("/conversations/{userId}")
    public ResponseEntity<?> getConversations(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(chatService.getConversationsForUser(userId));
    }

    @GetMapping("/pharmacists/search")
    public ResponseEntity<List<PharmacistSearchResponse>> searchPharmacists(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String pharmacyId) {
        return ResponseEntity.ok(chatService.searchPharmacists(q, pharmacyId));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Chat service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own conversations"));
    }
}
