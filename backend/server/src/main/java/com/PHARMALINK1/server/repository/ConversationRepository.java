package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findByPatientId(String patientId);
    List<Conversation> findByPharmacistId(String pharmacistId);
    Optional<Conversation> findByPatientIdAndPharmacistId(String patientId, String pharmacistId);
}