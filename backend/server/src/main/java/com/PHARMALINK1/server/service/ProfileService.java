package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.dto.ProfileUpdateRequest;
import com.PHARMALINK1.server.model.*;
import com.PHARMALINK1.server.repository.*;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final MedicationRepository medicationRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoseLogRepository doseLogRepository;

    public ProfileService(
            UserRepository userRepository,
            MedicationRepository medicationRepository,
            AppointmentRepository appointmentRepository,
            DoseLogRepository doseLogRepository) {
        this.userRepository = userRepository;
        this.medicationRepository = medicationRepository;
        this.appointmentRepository = appointmentRepository;
        this.doseLogRepository = doseLogRepository;
    }

    public Map<String, Object> getProfile(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("userId", user.getId());
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        profile.put("phoneNumber", user.getPhoneNumber());
        profile.put("profilePictureUrl", user.getProfilePictureUrl());
        profile.put("bloodGroup", user.getBloodGroup());
        profile.put("allergies", user.getAllergies());
        profile.put("conditions", user.getConditions());
        profile.put("adherenceRate", user.getAdherenceRate() != null ? user.getAdherenceRate() : 0);
        profile.put("dayStreak", user.getDayStreak() != null ? user.getDayStreak() : 0);
        profile.put("medicationCount", medicationRepository.countByUserIdAndStatus(userId, Medication.Status.ACTIVE));
        profile.put("appointmentCount", appointmentRepository.countByUserId(userId));
        profile.put("notificationsEnabled", user.isNotificationsEnabled());
        profile.put("privacyMode", user.isPrivacyMode());
        return profile;
    }

    public Map<String, Object> updateProfile(String userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getProfilePictureUrl() != null) user.setProfilePictureUrl(request.getProfilePictureUrl());
        if (request.getBloodGroup() != null) user.setBloodGroup(request.getBloodGroup());
        if (request.getAllergies() != null) user.setAllergies(request.getAllergies());
        if (request.getConditions() != null) user.setConditions(request.getConditions());
        if (request.getNotificationsEnabled() != null) user.setNotificationsEnabled(request.getNotificationsEnabled());
        if (request.getPrivacyMode() != null) user.setPrivacyMode(request.getPrivacyMode());
        userRepository.save(user);
        return getProfile(userId);
    }

    public List<Appointment> getAppointments(String userId) {
        return appointmentRepository.findByUserIdOrderByAppointmentDateAsc(userId);
    }

    public Appointment bookAppointment(String userId, Map<String, String> body) {
        Appointment appt = new Appointment();
        appt.setUserId(userId);
        appt.setProfessionalName(body.get("professionalName"));
        appt.setSpecialty(body.get("specialty"));
        appt.setAppointmentDate(LocalDate.parse(body.get("appointmentDate")));
        appt.setAppointmentTime(LocalTime.parse(body.get("appointmentTime")));
        return appointmentRepository.save(appt);
    }

    public Map<String, Object> logDose(String userId, String medicationId) {
        doseLogRepository.save(new DoseLog(userId, medicationId));
        User user = userRepository.findById(userId).orElseThrow();
        int streak = user.getDayStreak() != null ? user.getDayStreak() + 1 : 1;
        user.setDayStreak(streak);
        double adherence = Math.min(100, (user.getAdherenceRate() != null ? user.getAdherenceRate() : 0) + 2);
        user.setAdherenceRate(adherence);
        userRepository.save(user);
        Map<String, Object> result = new HashMap<>();
        result.put("dayStreak", streak);
        result.put("adherenceRate", adherence);
        return result;
    }

    public Map<String, Object> getAdherenceReport(String userId) {
        Map<String, Object> report = new LinkedHashMap<>();
        User user = userRepository.findById(userId).orElseThrow();
        report.put("adherenceRate", user.getAdherenceRate());
        report.put("dayStreak", user.getDayStreak());
        report.put("totalDosesLogged", doseLogRepository.countByUserId(userId));
        report.put("activeMedications", medicationRepository.countByUserIdAndStatus(userId, Medication.Status.ACTIVE));
        return report;
    }
}
