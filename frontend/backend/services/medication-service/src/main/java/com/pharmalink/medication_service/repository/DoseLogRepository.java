package com.pharmalink.medication_service.repository;

import com.pharmalink.medication_service.model.DoseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoseLogRepository extends JpaRepository<DoseLog, String> {
    List<DoseLog> findByUserIdOrderByTakenAtDesc(String userId);
    long countByUserId(String userId);

    // New — real per-dose history for a single medication (BACKEND_TODO.md's
    // flagged "no real dose-history tracking" gap). DoseLog already had
    // medicationId + takenAt; it just wasn't exposed via any endpoint before.
    List<DoseLog> findByMedicationIdOrderByTakenAtDesc(String medicationId);
}
