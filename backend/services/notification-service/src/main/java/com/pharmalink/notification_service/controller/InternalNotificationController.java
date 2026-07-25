package com.pharmalink.notification_service.controller;

import com.pharmalink.notification_service.dto.CreateNotificationRequest;
import com.pharmalink.notification_service.model.Notification;
import com.pharmalink.notification_service.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Service-to-service only — not routed by api-gateway (see its
// application.yaml comments), matching user-profile-service's
// /internal/profiles/** convention. order-service calls this when an
// order's status changes; this is the one and only producer wired in this
// pass, per your explicit choice.
@RestController
@RequestMapping("/internal/notifications")
public class InternalNotificationController {

    private final NotificationService notificationService;

    public InternalNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    public ResponseEntity<Notification> create(@Valid @RequestBody CreateNotificationRequest request) {
        return ResponseEntity.ok(notificationService.create(request));
    }
}
