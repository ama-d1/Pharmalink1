package com.pharmalink.notification_service.service;

import com.pharmalink.notification_service.client.ProfileClient;
import com.pharmalink.notification_service.dto.CreateNotificationRequest;
import com.pharmalink.notification_service.model.Notification;
import com.pharmalink.notification_service.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Every notification producer (order-service, community-service,
 * user-profile-service's AppointmentReminderScheduler) calls {@code
 * create()} via {@code POST /internal/notifications}. There's still no
 * push delivery (APNs/FCM) for the in-app side — this is a pure REST
 * poll/pull model (frontend calls GET /api/notifications/{userId}),
 * matching what BACKEND_TODO.md already flagged as the realistic v1 scope.
 *
 * Coming-soon roadmap item #6 (email notifications): create() also sends an
 * email for the two types in EMAIL_ELIGIBLE_TYPES, per your explicit scope
 * decision — order status and appointment reminders are time-sensitive
 * enough to warrant an email; community activity and chat messages are not
 * (emailing on every comment/message would be spammy, and there's no
 * throttling logic to soften that). Best-effort and fire-after-save: a
 * failed or skipped email never affects the in-app notification, which
 * already exists by the time the email is attempted.
 */
@Service
public class NotificationService {

    private static final Set<Notification.Type> EMAIL_ELIGIBLE_TYPES =
            EnumSet.of(Notification.Type.ORDER_STATUS, Notification.Type.APPOINTMENT_REMINDER);

    private final NotificationRepository notificationRepository;
    private final ProfileClient profileClient;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                                ProfileClient profileClient,
                                EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.profileClient = profileClient;
        this.emailService = emailService;
    }

    public Notification create(CreateNotificationRequest request) {
        Notification notification = new Notification();
        notification.setUserId(request.getUserId());
        notification.setType(request.getType());
        notification.setTitle(request.getTitle());
        notification.setBody(request.getBody());
        notification.setRelatedEntityId(request.getRelatedEntityId());
        Notification saved = notificationRepository.save(notification);

        if (EMAIL_ELIGIBLE_TYPES.contains(saved.getType())) {
            Optional<String> email = profileClient.getEmailIfEnabled(saved.getUserId());
            email.ifPresent(addr -> emailService.sendNotificationEmail(addr, saved.getTitle(), saved.getBody()));
        }

        return saved;
    }

    public List<Notification> getNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Map<String, Object> getUnreadCount(String userId) {
        return Map.of("unreadCount", notificationRepository.countByUserIdAndReadFalse(userId));
    }

    public Notification markRead(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    // Phase 2 ownership-check support (MICROSERVICES_PLAN.md §6 step 8) —
    // null (not an exception) on a missing id, same 404-vs-403 pattern used
    // everywhere else.
    public String getNotificationOwnerId(String notificationId) {
        return notificationRepository.findById(notificationId).map(Notification::getUserId).orElse(null);
    }
}
