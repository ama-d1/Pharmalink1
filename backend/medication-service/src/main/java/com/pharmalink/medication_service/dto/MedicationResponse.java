package com.pharmalink.medication_service.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class MedicationResponse {

    private String id;
    private String userId;
    private String name;
    private String dosage;
    private String frequency;
    private String instructions;
    private LocalTime reminderTime;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String doseStatus;
    private String message;

    public MedicationResponse() {}

    public MedicationResponse(String message) {
        this.message = message;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public LocalTime getReminderTime() { return reminderTime; }
    public void setReminderTime(LocalTime reminderTime) { this.reminderTime = reminderTime; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDoseStatus() { return doseStatus; }
    public void setDoseStatus(String doseStatus) { this.doseStatus = doseStatus; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}