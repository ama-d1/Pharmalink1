package com.pharmalink.chat_service.repository;

import com.pharmalink.chat_service.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByConversationIdOrderBySentAtAsc(String conversationId);

    // New — self-heal fallback for lastMessagePreview on conversations that
    // existed before that column was added (see Conversation's class
    // javadoc). Used only when the denormalized preview is null.
    Optional<Message> findTopByConversationIdOrderBySentAtDesc(String conversationId);
}
