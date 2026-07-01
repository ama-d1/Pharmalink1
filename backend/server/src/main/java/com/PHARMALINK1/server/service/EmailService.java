package com.PHARMALINK1.server.service;


import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;


@Service
public class EmailService {


private final JavaMailSender mailSender;


public EmailService(JavaMailSender mailSender){
    this.mailSender = mailSender;
}



public void sendResetEmail(
String email,
String token
){


String resetLink =
"https://pharmalink.com/reset-password?token="
+token;



SimpleMailMessage message =
new SimpleMailMessage();


message.setTo(email);

message.setSubject(
"Pharmalink Password Reset"
);


message.setText(
"Click the link below to reset your password:\n\n"
+resetLink
);


mailSender.send(message);


}


}