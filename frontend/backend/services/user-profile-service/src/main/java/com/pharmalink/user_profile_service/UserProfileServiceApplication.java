package com.pharmalink.user_profile_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling added for coming-soon roadmap item #7 (appointment
// reminders) — see AppointmentReminderScheduler. First scheduled job
// anywhere in this codebase.
@SpringBootApplication
@EnableScheduling
public class UserProfileServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserProfileServiceApplication.class, args);
    }
}
