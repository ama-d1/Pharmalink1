package com.pharmalink.user_profile_service.repository;

import com.pharmalink.user_profile_service.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findByUserIdOrderByAppointmentDateAsc(String userId);
    long countByUserId(String userId);

    // Coming-soon roadmap item #7 (AppointmentReminderScheduler): candidate
    // pool for the hourly reminder sweep. Widened to a 2-day date range
    // (rather than an exact 24h-out timestamp) so the query stays a simple,
    // index-friendly date comparison — the scheduler does the precise
    // "is this within the next 24h" check in Java against appointmentDate +
    // appointmentTime, since combining date+time comparison in JPQL across
    // two separate columns gets awkward. status/reminderSent are filtered
    // here since those are cheap equality checks that meaningfully shrink
    // the candidate set before the in-Java pass.
    List<Appointment> findByStatusAndReminderSentFalseAndAppointmentDateBetween(
            Appointment.Status status, LocalDate start, LocalDate end);
}
