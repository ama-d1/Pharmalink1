package com.pharmalink.medication_service.service;

import com.pharmalink.medication_service.dto.MedicationRequest;
import com.pharmalink.medication_service.dto.MedicationResponse;
import com.pharmalink.medication_service.model.Medication;
import com.pharmalink.medication_service.repository.MedicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MedicationService {

    @Autowired
    private MedicationRepository medicationRepository;

    public MedicationResponse addMedication(MedicationRequest request) {
        Medication medication = new Medication();
        medication.setUserId(request.getUserId());
        medication.setName(request.getName());
        medication.setDosage(request.getDosage());
        medication.setFrequency(request.getFrequency());
        medication.setInstructions(request.getInstructions());
        medication.setReminderTime(request.getReminderTime());
        medication.setStartDate(request.getStartDate());
        medication.setEndDate(request.getEndDate());
        medication.setStatus(Medication.Status.ACTIVE);
        medication.setDoseStatus(Medication.DoseStatus.PENDING);

        medicationRepository.save(medication);
        return mapToResponse(medication);
    }

    public List<MedicationResponse> getUserMedications(String userId) {
        return medicationRepository.findByUserId(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<MedicationResponse> getActiveMedications(String userId) {
        return medicationRepository.findByUserIdAndStatus(userId, Medication.Status.ACTIVE)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MedicationResponse updateDoseStatus(String medicationId, String doseStatus) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new RuntimeException("Medication not found"));

        medication.setDoseStatus(Medication.DoseStatus.valueOf(doseStatus));
        medicationRepository.save(medication);
        return mapToResponse(medication);
    }

    public long countActiveMedications(String userId) {
        return medicationRepository.countByUserIdAndStatus(userId, Medication.Status.ACTIVE);
    }

    public void deleteMedication(String medicationId) {
        medicationRepository.deleteById(medicationId);
    }

    private MedicationResponse mapToResponse(Medication medication) {
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
        return response;
    }
}