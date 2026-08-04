package com.pharmalink.medication_service.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * New — closes the flagged gap in BACKEND_TODO.md: there was no edit
 * endpoint at all before (frontend faked it via delete+recreate). All
 * fields optional/nullable; only non-null fields are applied, same partial-
 * update pattern used by ProfileUpdateRequest in user-profile-service.
 */
public class MedicationUpdateRequest {
    private String name;
    private String dosage;
    private String frequency;
    private String instructions;
    private LocalTime reminderTime;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // "ACTIVE" | "INACTIVE" | "COMPLETED"

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
}
