package com.pharmalink.medication_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public class MedicationRequest {

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "Medication name is required")
    private String name;

    @NotBlank(message = "Dosage is required")
    private String dosage;

    @NotBlank(message = "Frequency is required")
    private String frequency;

    private String instructions;

    @NotNull(message = "Reminder time is required")
    private LocalTime reminderTime;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    public MedicationRequest() {}

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
}