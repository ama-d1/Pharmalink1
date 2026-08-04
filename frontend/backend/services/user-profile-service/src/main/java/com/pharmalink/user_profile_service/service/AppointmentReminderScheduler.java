package com.pharmalink.user_profile_service.service;

import com.pharmalink.user_profile_service.client.NotificationClient;
import com.pharmalink.user_profile_service.model.Appointment;
import com.pharmalink.user_profile_service.model.Profile;
import com.pharmalink.user_profile_service.repository.AppointmentRepository;
import com.pharmalink.user_profile_service.repository.ProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Coming-soon roadmap item #7 (COMING_SOON_ROADMAP.md): "Appointment
 * reminders". Runs hourly, finds SCHEDULED/not-yet-reminded appointments
 * happening within the next 24h, and notifies each user (unless they've
 * turned appointmentReminders off — fail-open if their profile is somehow
 * missing, same convention as CommunityService.isCommunityAlertsEnabled).
 *
 * Candidate pool comes from a widened 2-day date-range query (today +
 * tomorrow) so the DB side stays a simple index-friendly comparison; the
 * precise "is this actually within the next 24h" check happens here in
 * Java by combining appointmentDate + appointmentTime into a LocalDateTime
 * and comparing against [now, now+24h]. Running hourly (not daily) keeps
 * the "24h before" promise reasonably tight without needing per-appointment
 * scheduled triggers.
 */
@Component
public class AppointmentReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReminderScheduler.class);
    private static final DateTimeFormatter WHEN_FORMAT = DateTimeFormatter.ofPattern("EEE, MMM d 'at' h:mm a");

    private final AppointmentRepository appointmentRepository;
    private final ProfileRepository profileRepository;
    private final NotificationClient notificationClient;

    public AppointmentReminderScheduler(AppointmentRepository appointmentRepository,
                                         ProfileRepository profileRepository,
                                         NotificationClient notificationClient) {
        this.appointmentRepository = appointmentRepository;
        this.profileRepository = profileRepository;
        this.notificationClient = notificationClient;
    }

    @Scheduled(fixedRate = 60 * 60 * 1000) // hourly
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.plusHours(24);
        LocalDate today = now.toLocalDate();
        LocalDate tomorrow = today.plusDays(1);

        List<Appointment> candidates = appointmentRepository
                .findByStatusAndReminderSentFalseAndAppointmentDateBetween(Appointment.Status.SCHEDULED, today, tomorrow);

        int sent = 0;
        for (Appointment appt : candidates) {
            if (appt.getAppointmentDate() == null || appt.getAppointmentTime() == null) {
                continue; // malformed data — nothing sensible to compare, skip rather than guess
            }
            LocalDateTime apptDateTime = LocalDateTime.of(appt.getAppointmentDate(), appt.getAppointmentTime());
            if (apptDateTime.isBefore(now) || apptDateTime.isAfter(cutoff)) {
                continue; // outside the actual 24h window — the date-range query is just a coarse pre-filter
            }

            boolean remindersEnabled = profileRepository.findById(appt.getUserId())
                    .map(Profile::isAppointmentReminders)
                    .orElse(true); // fail-open, same as CommunityService.isCommunityAlertsEnabled

            if (!remindersEnabled) {
                appt.setReminderSent(true); // user opted out — don't keep re-checking this appointment every hour
                appointmentRepository.save(appt);
                continue;
            }

            try {
                notificationClient.notifyAppointmentReminder(
                        appt.getUserId(), appt.getId(), appt.getProfessionalName(), "on " + apptDateTime.format(WHEN_FORMAT));
                appt.setReminderSent(true);
                appointmentRepository.save(appt);
                sent++;
            } catch (RestClientException e) {
                log.warn("Could not send appointment reminder for appointment {}: {}", appt.getId(), e.getMessage());
                // reminderSent stays false — retried on next hourly run
            }
        }

        if (sent > 0) {
            log.info("AppointmentReminderScheduler: sent {} reminder(s)", sent);
        }
    }
}
