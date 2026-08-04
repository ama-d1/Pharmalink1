package com.pharmalink.notification_service.controller;

import com.pharmalink.notification_service.security.AuthContext;
import com.pharmalink.notification_service.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Public-facing routes, per BACKEND_TODO.md's original ask: GET
// /api/notifications/{userId} and PATCH /api/notifications/{id}/read.
// GET .../unread-count is a small natural addition (badge counts) beyond
// what was originally asked for, following the same low-risk-addition
// pattern used elsewhere (e.g. medication-service's dose-count endpoint).
//
// Phase 2 (step 8): ownership checks added throughout.
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getNotifications(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(notificationService.getNotifications(userId));
    }

    @GetMapping("/{userId}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) return forbidden();
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<?> markRead(@PathVariable String notificationId, HttpServletRequest request) {
        String ownerId = notificationService.getNotificationOwnerId(notificationId);
        if (ownerId == null) return ResponseEntity.status(404).body(Map.of("message", "Notification not found"));
        if (!AuthContext.isOwnerOrAdmin(request, ownerId)) return forbidden();
        return ResponseEntity.ok(notificationService.markRead(notificationId));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Notification service is running!");
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
    }
}
