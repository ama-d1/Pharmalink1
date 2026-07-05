package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.dto.MessageRequest;
import com.PHARMALINK1.server.dto.PharmacistSearchResponse;
import com.PHARMALINK1.server.model.Conversation;
import com.PHARMALINK1.server.model.Message;
import com.PHARMALINK1.server.model.User;
import com.PHARMALINK1.server.repository.ConversationRepository;
import com.PHARMALINK1.server.repository.MessageRepository;
import com.PHARMALINK1.server.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       UserRepository userRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
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

        conversationRepository.findById(request.getConversationId()).ifPresent(c -> {
            c.setLastMessageAt(LocalDateTime.now());
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

    public List<Conversation> getConversationsForUser(String userId) {
        List<Conversation> asPatient = conversationRepository.findByPatientId(userId);
        List<Conversation> asPharmacist = conversationRepository.findByPharmacistId(userId);
        asPatient.addAll(asPharmacist);
        return asPatient;
    }

    public List<PharmacistSearchResponse> searchPharmacists(String query, String pharmacyId) {
        List<User> pharmacists;
        if (pharmacyId != null && !pharmacyId.isBlank()) {
            pharmacists = userRepository.findByRoleAndPharmacyId(User.Role.PHARMACIST, pharmacyId);
        } else {
            pharmacists = userRepository.findByRoleAndFullNameContainingIgnoreCase(User.Role.PHARMACIST, query == null ? "" : query);
        }
        return pharmacists.stream()
            .map(u -> new PharmacistSearchResponse(u.getId(), u.getFullName(), u.getPharmacyId(), u.getPharmacyName(), u.getEmail()))
            .toList();
    }
}