package com.pharmalink.medication_service.service;

import com.pharmalink.medication_service.dto.DoseLogRequest;
import com.pharmalink.medication_service.dto.MedicationRequest;
import com.pharmalink.medication_service.dto.MedicationResponse;
import com.pharmalink.medication_service.dto.MedicationUpdateRequest;
import com.pharmalink.medication_service.model.DoseLog;
import com.pharmalink.medication_service.model.Medication;
import com.pharmalink.medication_service.repository.DoseLogRepository;
import com.pharmalink.medication_service.repository.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final DoseLogRepository doseLogRepository;

    public MedicationService(MedicationRepository medicationRepository, DoseLogRepository doseLogRepository) {
        this.medicationRepository = medicationRepository;
        this.doseLogRepository = doseLogRepository;
    }

    public MedicationResponse addMedication(MedicationRequest request) {
        Medication medication = new Medication();

        // Assigned explicitly (not left to the UUID generator) so we can set
        // medicationGroupId to the same value in the same insert when the
        // caller doesn't supply one — see Medication.medicationGroupId javadoc.
        String id = UUID.randomUUID().toString();
        medication.setId(id);
        medication.setUserId(request.getUserId());
        medication.setName(request.getName());
        medication.setDosage(request.getDosage());
        medication.setFrequency(request.getFrequency());
        medication.setInstructions(request.getInstructions());
        medication.setReminderTime(request.getReminderTime());
        medication.setStartDate(request.getStartDate());
        medication.setEndDate(request.getEndDate());
        medication.setMedicationGroupId(
                request.getMedicationGroupId() != null && !request.getMedicationGroupId().isBlank()
                        ? request.getMedicationGroupId()
                        : id
        );

        Medication saved = medicationRepository.save(medication);
        return convertToResponse(saved);
    }

    public List<MedicationResponse> getUserMedications(String userId) {
        return medicationRepository.findByUserId(userId).stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<MedicationResponse> getActiveMedications(String userId) {
        return medicationRepository.findByUserIdAndStatus(userId, Medication.Status.ACTIVE).stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<MedicationResponse> getMedicationsInGroup(String medicationGroupId) {
        return medicationRepository.findByMedicationGroupId(medicationGroupId).stream()
                .map(this::convertToResponse)
                .toList();
    }

    public MedicationResponse updateDoseStatus(String medicationId, String status) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));

        medication.setDoseStatus(Medication.DoseStatus.valueOf(status.toUpperCase()));

        return convertToResponse(medicationRepository.save(medication));
    }

    // New — the flagged missing edit endpoint. Edits a single row.
    public MedicationResponse updateMedication(String medicationId, MedicationUpdateRequest request) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        applyUpdate(medication, request);
        return convertToResponse(medicationRepository.save(medication));
    }

    // New — edits every row sharing a medicationGroupId (e.g. both rows of a
    // "twice daily" medication) in one call. Intentionally does not touch
    // reminderTime — each row in a group keeps its own dose time; only the
    // fields that describe the medication itself (not a specific dose) are
    // shared across the group.
    public List<MedicationResponse> updateMedicationGroup(String medicationGroupId, MedicationUpdateRequest request) {
        List<Medication> group = medicationRepository.findByMedicationGroupId(medicationGroupId);
        if (group.isEmpty()) {
            throw new IllegalArgumentException("No medications found for group " + medicationGroupId);
        }
        for (Medication medication : group) {
            applySharedGroupFields(medication, request);
        }
        return medicationRepository.saveAll(group).stream()
                .map(this::convertToResponse)
                .toList();
    }

    private void applyUpdate(Medication medication, MedicationUpdateRequest request) {
        if (request.getName() != null) medication.setName(request.getName());
        if (request.getDosage() != null) medication.setDosage(request.getDosage());
        if (request.getFrequency() != null) medication.setFrequency(request.getFrequency());
        if (request.getInstructions() != null) medication.setInstructions(request.getInstructions());
        if (request.getReminderTime() != null) medication.setReminderTime(request.getReminderTime());
        if (request.getStartDate() != null) medication.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) medication.setEndDate(request.getEndDate());
        if (request.getStatus() != null) medication.setStatus(Medication.Status.valueOf(request.getStatus().toUpperCase()));
    }

    private void applySharedGroupFields(Medication medication, MedicationUpdateRequest request) {
        if (request.getName() != null) medication.setName(request.getName());
        if (request.getDosage() != null) medication.setDosage(request.getDosage());
        if (request.getFrequency() != null) medication.setFrequency(request.getFrequency());
        if (request.getInstructions() != null) medication.setInstructions(request.getInstructions());
        if (request.getStartDate() != null) medication.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) medication.setEndDate(request.getEndDate());
        if (request.getStatus() != null) medication.setStatus(Medication.Status.valueOf(request.getStatus().toUpperCase()));
    }

    public long countActiveMedications(String userId) {
        return medicationRepository.countByUserIdAndStatus(userId, Medication.Status.ACTIVE);
    }

    public void deleteMedication(String medicationId) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        medicationRepository.delete(medication);
    }

    // New — restores dose-logging, previously dropped when ProfileService
    // (its old home in the monolith) was removed during the
    // user-profile-service extraction. user-profile-service now calls this
    // endpoint instead of writing DoseLog itself, since DoseLog belongs here.
    //
    // Includes a basic ownership check the original code never had: the
    // userId logging the dose must match the medication's owner. Cheap,
    // clearly correct, and closes an obvious spoofing gap — not scope creep.
    public DoseLog logDose(String medicationId, DoseLogRequest request) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));

        if (!medication.getUserId().equals(request.getUserId())) {
            throw new IllegalArgumentException("Medication does not belong to this user");
        }

        return doseLogRepository.save(new DoseLog(request.getUserId(), medicationId));
    }

    // New — real per-dose history for one medication (BACKEND_TODO.md's
    // flagged gap; DoseLog already had the data, nothing exposed it).
    public List<DoseLog> getDoseHistory(String medicationId) {
        return doseLogRepository.findByMedicationIdOrderByTakenAtDesc(medicationId);
    }

    public long getDoseCountForUser(String userId) {
        return doseLogRepository.countByUserId(userId);
    }

    // ── Phase 2 ownership-check support (MICROSERVICES_PLAN.md §6 step 8) ──
    // These resolve "who owns this resource" for the controller's
    // AuthContext.isOwnerOrAdmin() checks on endpoints keyed by
    // medicationId/medicationGroupId rather than userId directly. Return
    // null (not throw) on a not-found id — the controller treats a null
    // owner as "not found", not "forbidden", so a 404 vs 403 stays honest.

    public String getMedicationOwnerId(String medicationId) {
        return medicationRepository.findById(medicationId).map(Medication::getUserId).orElse(null);
    }

    public String getMedicationGroupOwnerId(String medicationGroupId) {
        List<Medication> group = medicationRepository.findByMedicationGroupId(medicationGroupId);
        return group.isEmpty() ? null : group.get(0).getUserId();
    }

    private MedicationResponse convertToResponse(Medication medication) {
        MedicationResponse response = new MedicationResponse();
        response.setId(medication.getId());
        response.setUserId(medication.getUserId());
        response.setName(medication.getName());
        response.setDosage(medication.getDosage());
        response.setFrequency(medication.getFrequency());
        response.setInstructions(medication.getInstructions());
        response.setReminderTime(medication.getReminderTime());
        response.setStartDate(medication.getStartDate());
        response.setEndDate(medication.getEndDate());
        response.setStatus(medication.getStatus().name());
        response.setDoseStatus(medication.getDoseStatus().name());
        response.setMedicationGroupId(medication.getMedicationGroupId());
        return response;
    }
}
