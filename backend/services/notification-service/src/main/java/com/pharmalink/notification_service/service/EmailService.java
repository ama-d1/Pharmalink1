package com.pharmalink.notification_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Coming-soon roadmap item #6 (COMING_SOON_ROADMAP.md): "Email
 * notifications". Same JavaMailSender/SimpleMailMessage pattern as
 * auth-service's EmailService, reusing the same Gmail account (see
 * application.yaml). Best-effort by design — a failed send must never
 * break notification creation itself; the notification already exists
 * in-app regardless of whether the email goes out.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendNotificationEmail(String toEmail, String title, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("PharmaLink — " + title);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException e) {
            log.warn("Failed to send notification email to {}: {}", toEmail, e.getMessage());
        }
    }
}
