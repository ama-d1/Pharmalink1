package com.pharmalink.chat_service.service;

import com.pharmalink.chat_service.client.ProfileClient;
import com.pharmalink.chat_service.dto.ConversationResponse;
import com.pharmalink.chat_service.dto.MessageRequest;
import com.pharmalink.chat_service.dto.PharmacistSearchResponse;
import com.pharmalink.chat_service.model.Conversation;
import com.pharmalink.chat_service.model.Message;
import com.pharmalink.chat_service.repository.ConversationRepository;
import com.pharmalink.chat_service.repository.MessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ProfileClient profileClient;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       SimpMessagingTemplate messagingTemplate,
                       ProfileClient profileClient) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.profileClient = profileClient;
    }

    public Conversation startConversation(String patientId, String pharmacistId) {
        return conversationRepository
                .findByPatientIdAndPharmacistId(patientId, pharmacistId)
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setPatientId(patientId);
                    c.setPharmacistId(pharmacistId);
                    return conversationRepository.save(c);
                });
    }

    // Added 2026-07-24 — patient<->driver chat, mirrors startConversation()
    // exactly (find-or-create, same lastMessageAt/preview initialization via
    // Conversation's @PrePersist), just keyed by driverId instead of
    // pharmacistId.
    public Conversation startDriverConversation(String patientId, String driverId) {
        return conversationRepository
                .findByPatientIdAndDriverId(patientId, driverId)
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setPatientId(patientId);
                    c.setDriverId(driverId);
                    return conversationRepository.save(c);
                });
    }

    public Message sendMessage(MessageRequest request) {
        Message message = new Message();
        message.setConversationId(request.getConversationId());
        message.setSenderId(request.getSenderId());
        message.setContent(request.getContent());
        message.setSentAt(LocalDateTime.now());

        if (request.getMessageType() != null) {
            try {
                message.setMessageType(Message.MessageType.valueOf(request.getMessageType().toUpperCase()));
            } catch (IllegalArgumentException e) {
                message.setMessageType(Message.MessageType.TEXT);
            }
        }
        message.setMediaUrl(request.getMediaUrl());

        // lastMessagePreview added here (see Conversation's class javadoc) —
        // this is what closes the "no last-message preview" flagged gap.
        conversationRepository.findById(request.getConversationId()).ifPresent(c -> {
            c.setLastMessageAt(LocalDateTime.now());
            c.setLastMessagePreview(request.getContent());
            conversationRepository.save(c);
        });

        Message saved = messageRepository.save(message);

        messagingTemplate.convertAndSend(
            "/topic/conversation/" + saved.getConversationId(),
            saved
        );

        return saved;
    }

    public List<Message> getMessages(String conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    // Closes BACKEND_TODO.md's flagged gap: enriches each conversation with
    // the OTHER participant's id/name (computed per-request, since it
    // depends on which side of the conversation userId is on) and a
    // last-message preview, self-healing for conversations that predate the
    // lastMessagePreview column by falling back to a direct query.
    public List<ConversationResponse> getConversationsForUser(String userId) {
        List<Conversation> asPatient = conversationRepository.findByPatientId(userId);
        List<Conversation> asPharmacist = conversationRepository.findByPharmacistId(userId);
        // Added 2026-07-24 — without this, a driver's own conversations (or
        // a patient's driver-conversations, already covered by asPatient
        // above) would silently never show up for the driver side of a
        // patient<->driver chat.
        List<Conversation> asDriver = conversationRepository.findByDriverId(userId);
        asPatient.addAll(asPharmacist);
        asPatient.addAll(asDriver);

        List<String> otherIds = asPatient.stream()
                .map(c -> otherParticipantId(c, userId))
                .distinct()
                .toList();
        Map<String, String> namesById = profileClient.resolveNames(otherIds);

        return asPatient.stream()
                .map(c -> toResponse(c, userId, namesById))
                .toList();
    }

    // Added 2026-07-24: a conversation now has three possible participant
    // columns (patientId always set, plus exactly one of pharmacistId/
    // driverId). "The other side" is patientId's counterpart when userId is
    // the patient, or patientId itself when userId is on the other side —
    // whichever of pharmacistId/driverId is actually populated for this row.
    private String otherParticipantId(Conversation c, String userId) {
        if (userId.equals(c.getPatientId())) {
            return c.getPharmacistId() != null ? c.getPharmacistId() : c.getDriverId();
        }
        return c.getPatientId();
    }

    private ConversationResponse toResponse(Conversation c, String userId, Map<String, String> namesById) {
        String otherId = otherParticipantId(c, userId);

        ConversationResponse response = new ConversationResponse();
        response.setId(c.getId());
        response.setPatientId(c.getPatientId());
        response.setPharmacistId(c.getPharmacistId());
        response.setOtherParticipantId(otherId);
        response.setOtherParticipantName(namesById.get(otherId));
        response.setLastMessageAt(c.getLastMessageAt());
        response.setCreatedAt(c.getCreatedAt());

        String preview = c.getLastMessagePreview();
        if (preview == null) {
            // Self-heal fallback for conversations that existed before
            // lastMessagePreview was added — see Conversation's class javadoc.
            preview = messageRepository.findTopByConversationIdOrderBySentAtDesc(c.getId())
                    .map(Message::getContent)
                    .orElse(null);
        }
        response.setLastMessagePreview(preview);

        return response;
    }

    // ── Phase 2 ownership-check support (MICROSERVICES_PLAN.md §6 step 8) ──
    // Conversations aren't owned by a single userId — either participant
    // (patientId or pharmacistId) should be able to read/send. null (not an
    // exception) on a missing conversationId, same 404-vs-403 reasoning as
    // every other service's owner-lookup method.

    public Conversation getConversationOrNull(String conversationId) {
        return conversationRepository.findById(conversationId).orElse(null);
    }

    public boolean isParticipant(Conversation conversation, String userId) {
        return userId != null
                && (userId.equals(conversation.getPatientId())
                    || userId.equals(conversation.getPharmacistId())
                    || userId.equals(conversation.getDriverId()));
    }

    // Delegates entirely to user-profile-service now — role lives in
    // auth-service, pharmacyId/fullName in user-profile-service, and the
    // latter denormalizes role for exactly this search. See ProfileClient
    // javadoc and MICROSERVICES_PLAN.md §6 step 5b.
    public List<PharmacistSearchResponse> searchPharmacists(String query, String pharmacyId) {
        return profileClient.searchPharmacists(query, pharmacyId).stream()
                .map(m -> new PharmacistSearchResponse(
                        (String) m.get("userId"),
                        (String) m.get("fullName"),
                        (String) m.get("pharmacyId"),
                        (String) m.get("pharmacyName"),
                        (String) m.get("email")
                ))
                .collect(Collectors.toList());
    }
}
