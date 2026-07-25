package com.pharmalink.user_profile_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalTime;

// Moved as-is from the monolith's model/Appointment.java — no field changes.
@Entity
@Table(name = "appointments")
public class Appointment {

    public enum Status { SCHEDULED, COMPLETED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String professionalName;
    private String specialty;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;

    @Enumerated(EnumType.STRING)
    private Status status = Status.SCHEDULED;

    // Coming-soon roadmap item #7 (COMING_SOON_ROADMAP.md): set true once
    // AppointmentReminderScheduler has sent the 24h-before reminder for this
    // appointment, so the hourly job never double-notifies. Not reset if an
    // appointment is rescheduled today — rescheduling isn't a feature yet
    // (no PUT/edit endpoint exists), so that edge case doesn't arise.
    @Column(nullable = false)
    private boolean reminderSent = false;

    public Appointment() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getProfessionalName() { return professionalName; }
    public void setProfessionalName(String professionalName) { this.professionalName = professionalName; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public LocalDate getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDate appointmentDate) { this.appointmentDate = appointmentDate; }

    public LocalTime getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(LocalTime appointmentTime) { this.appointmentTime = appointmentTime; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public boolean isReminderSent() { return reminderSent; }
    public void setReminderSent(boolean reminderSent) { this.reminderSent = reminderSent; }
}
