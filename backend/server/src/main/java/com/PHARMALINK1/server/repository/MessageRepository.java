package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByConversationIdOrderBySentAtAsc(String conversationId);
}