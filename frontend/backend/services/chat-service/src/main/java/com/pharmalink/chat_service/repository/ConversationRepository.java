package com.pharmalink.chat_service.repository;

import com.pharmalink.chat_service.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

// Moved as-is from the monolith's repository/ConversationRepository.java.
public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findByPatientId(String patientId);
    List<Conversation> findByPharmacistId(String pharmacistId);
    Optional<Conversation> findByPatientIdAndPharmacistId(String patientId, String pharmacistId);

    // Added 2026-07-24 for patient<->driver chat.
    List<Conversation> findByDriverId(String driverId);
    Optional<Conversation> findByPatientIdAndDriverId(String patientId, String driverId);
}
