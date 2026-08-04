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
        // The CODE is the primary instruction, and the deep link is the
        // secondary convenience — not the other way round.
        //
        // Why: `pharmalink://…` is a custom URL scheme, and mail clients only
        // auto-linkify http(s). In Gmail/Outlook/webmail it renders as plain
        // grey text that can't be tapped (many also strip non-http hrefs even
        // in HTML mail). The old body led with that link and mentioned the
        // token nowhere, so anyone whose client didn't handle the scheme had
        // literally no way to finish resetting their password.
        //
        // Quoting the code on its own indented line keeps it clear of the
        // surrounding prose so it's easy to select and copy on a phone.
        message.setText(
                "Use this code in the PharmaLink app to reset your password:\n\n"
                        + "    " + token + "\n\n"
                        + "In the app: Forgot Password → \"I already have a code\" → paste it in.\n\n"
                        + "If your email app supports it, this link opens the app directly:\n"
                        + resetLink + "\n\n"
                        + "This code expires in 30 minutes. If you didn't request it, you can ignore "
                        + "this email — your password hasn't changed.");

        mailSender.send(message);
    }

    /**
     * Sign-up verification code (auth redesign, 2026-08-04). Separate from
     * sendTwoFactorCode() below even though both mail a number: this one is
     * the last step of creating an account, so the copy has to make clear
     * that nothing works until the code is entered — a 2FA-style "if you
     * didn't try to log in, ignore this" would be actively misleading here.
     */
    public void sendVerificationCode(String email, String code, long validMinutes) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Confirm your PharmaLink account");
        message.setText(
                "Welcome to PharmaLink!\n\n"
                        + "Enter this code in the app to finish setting up your account:\n\n"
                        + "    " + code + "\n\n"
                        + "The code expires in " + validMinutes + " minutes. If it does, tap \"Resend\" on the "
                        + "verification screen for a new one.\n\n"
                        + "If you didn't create a PharmaLink account, you can ignore this email — "
                        + "the account stays locked until this code is entered.");
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
