package com.pharmalink.auth_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String resetPasswordDeepLinkBase;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.reset-password.deep-link-base}") String resetPasswordDeepLinkBase) {
        this.mailSender = mailSender;
        this.resetPasswordDeepLinkBase = resetPasswordDeepLinkBase;
    }

    /**
     * Fixes BACKEND_TODO.md's flagged issue: the old link pointed at
     * https://pharmalink.com/reset-password — a domain that doesn't exist
     * and wouldn't open the mobile app even if it did. This now builds a
     * custom-scheme deep link (pharmalink://reset-password?token=...) that
     * frontend/app/reset-password.tsx is already built to handle. If/when a
     * universal link (https://) is set up instead, only deep-link-base in
     * application.yaml needs to change.
     */
    public void sendResetEmail(String email, String token) {
        String resetLink = resetPasswordDeepLinkBase + "?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("PharmaLink Password Reset");
        message.setText("Click the link below to reset your password:\n\n" + resetLink
                + "\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.");

        mailSender.send(message);
    }

    // Coming-soon roadmap item #9: email-based 2FA one-time code.
    public void sendTwoFactorCode(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Your PharmaLink verification code");
        message.setText("Your verification code is: " + code
                + "\n\nThis code expires in 10 minutes. If you didn't try to log in, you can ignore this email — your password is still safe.");
        mailSender.send(message);
    }
}
