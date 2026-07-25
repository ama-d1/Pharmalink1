package com.pharmalink.user_profile_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Calls notification-service's internal creation endpoint for the 24h-out
 * appointment reminder — closes coming-soon roadmap item #7
 * (COMING_SOON_ROADMAP.md "Appointment reminders"). Unlike
 * community-service's NotificationClient, this method does NOT swallow
 * RestClientException itself — it lets it propagate so
 * AppointmentReminderScheduler can catch it per-appointment inside its
 * sweep loop. That way one failed call skips just that appointment
 * (reminderSent stays false, so it's retried on the next hourly run)
 * without aborting notifications for every other appointment in the batch.
 */
@Component
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(@Value("${services.notification.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestInterceptor(new ForwardedHeadersInterceptor()).build();
    }

    public void notifyAppointmentReminder(String userId, String appointmentId, String professionalName, String when) {
        Map<String, String> body = Map.of(
                "userId", userId,
                "type", "APPOINTMENT_REMINDER",
                "title", "Upcoming appointment",
                "body", "You have an appointment with " + (professionalName != null ? professionalName : "your provider") + " " + when,
                "relatedEntityId", appointmentId
        );
        restClient.post()
                .uri("/internal/notifications")
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }
}
