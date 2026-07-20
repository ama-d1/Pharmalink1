package com.PHARMALINK1.server.service;

import org.springframework.stereotype.Service;

import com.PHARMALINK1.server.dto.MedicationRequest;
import com.PHARMALINK1.server.dto.MedicationResponse;
import com.PHARMALINK1.server.model.Medication;
import com.PHARMALINK1.server.repository.MedicationRepository;
import java.util.List;


@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;

    public MedicationService(MedicationRepository medicationRepository) {
        this.medicationRepository = medicationRepository;
    }


    public MedicationResponse addMedication(MedicationRequest request) {

        Medication medication = new Medication();

        medication.setUserId(request.getUserId());   // was missing — caused NOT NULL violation
        medication.setName(request.getName());
        medication.setDosage(request.getDosage());
        medication.setFrequency(request.getFrequency());
        medication.setInstructions(request.getInstructions());
        medication.setReminderTime(request.getReminderTime());
        medication.setStartDate(request.getStartDate());
        medication.setEndDate(request.getEndDate());

        Medication saved = medicationRepository.save(medication);


        MedicationResponse response = new MedicationResponse();

response.setId(saved.getId());
response.setName(saved.getName());
response.setDosage(saved.getDosage());
response.setFrequency(saved.getFrequency());
response.setInstructions(saved.getInstructions());
response.setReminderTime(saved.getReminderTime());
response.setStartDate(saved.getStartDate());
response.setEndDate(saved.getEndDate());
response.setStatus(saved.getStatus().name());
response.setDoseStatus(saved.getDoseStatus().name());

return response;
        
    }
    public List<MedicationResponse> getUserMedications(String userId) {

    List<Medication> medications = medicationRepository.findByUserId(userId);

    return medications.stream()
            .map(this::convertToResponse)
            .toList();
}


public List<MedicationResponse> getActiveMedications(String userId) {

    List<Medication> medications =
            medicationRepository.findByUserIdAndStatus(
                    userId,
                    Medication.Status.ACTIVE
            );

    return medications.stream()
            .map(this::convertToResponse)
            .toList();
}


public MedicationResponse updateDoseStatus(String medicationId, String status) {

    Medication medication = medicationRepository.findById(medicationId)
            .orElseThrow(() -> new RuntimeException("Medication not found"));


    medication.setDoseStatus(
            Medication.DoseStatus.valueOf(status.toUpperCase())
    );


    Medication saved = medicationRepository.save(medication);

    return convertToResponse(saved);
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

    response.setDoseStatus(
            medication.getDoseStatus().name()
    );

    return response;
}
public long countActiveMedications(String userId) {

    return medicationRepository.countByUserIdAndStatus(
            userId,
            Medication.Status.ACTIVE
    );
}


public void deleteMedication(String medicationId) {

    Medication medication = medicationRepository.findById(medicationId)
            .orElseThrow(() -> new RuntimeException("Medication not found"));

    medicationRepository.delete(medication);
}
}