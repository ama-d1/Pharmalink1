package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.dto.MessageRequest;
import com.PHARMALINK1.server.model.Conversation;
import com.PHARMALINK1.server.model.Message;
import com.PHARMALINK1.server.repository.ConversationRepository;
import com.PHARMALINK1.server.repository.MessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
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
}