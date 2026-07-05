package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicationRepository extends JpaRepository<Medication, String> {

    List<Medication> findByUserId(String userId);

    List<Medication> findByUserIdAndStatus(String userId, Medication.Status status);

    List<Medication> findByUserIdAndDoseStatus(String userId, Medication.DoseStatus doseStatus);

    long countByUserIdAndStatus(String userId, Medication.Status status);
}