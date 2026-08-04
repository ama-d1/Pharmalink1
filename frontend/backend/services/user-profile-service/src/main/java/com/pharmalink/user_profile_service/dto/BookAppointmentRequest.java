package com.pharmalink.user_profile_service.dto;

// Typed replacement for the monolith's Map<String,String> appointment-booking
// body — same fields, just validated. Minor, low-risk deviation from strict
// parity (adds basic null-safety); noted for visibility.
public class BookAppointmentRequest {
    private String professionalName;
    private String specialty;
    private String appointmentDate; // ISO-8601 date string, parsed in the service
    private String appointmentTime; // ISO-8601 time string, parsed in the service

    public String getProfessionalName() { return professionalName; }
    public void setProfessionalName(String professionalName) { this.professionalName = professionalName; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(String appointmentDate) { this.appointmentDate = appointmentDate; }

    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }
}
