package com.pharmalink.auth_service.config;

import com.pharmalink.auth_service.model.User;
import com.pharmalink.auth_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Solves the chicken-and-egg problem in role provisioning: every path to
 * becoming an ADMIN (see admin-service's role-cycle in the frontend's
 * (admin)/users.tsx) requires an admin to already exist to do the
 * promoting. On a brand-new deployment (fresh Postgres volume), there is no
 * admin at all and no in-app way to create one.
 *
 * Fix: set FIRST_ADMIN_EMAIL to the email of an account you've already
 * registered normally through the app (self-registration always produces a
 * PATIENT — see AuthService.register()). On every auth-service startup,
 * IF no ADMIN exists yet AND a user with that exact email is found, that
 * user is promoted to ADMIN. From then on, existsByRole(ADMIN) is true and
 * this becomes a permanent no-op — it will never touch a second account or
 * demote/reassign anyone, and it never creates an account out of thin air
 * (no password to set, so there's nothing to seed insecurely).
 *
 * Practical flow: register the intended admin's account in the app first,
 * set FIRST_ADMIN_EMAIL in .env / docker-compose.yml, then
 * `docker compose restart auth-service` (or up --build) — CommandLineRunner
 * only runs at startup, not continuously, so a restart is what triggers the
 * promotion if the account didn't exist yet the first time this ran.
 *
 * Same seed-on-startup convention as DataInitializer in
 * pharmacy-service/drug-catalog-service/community-service/home-service
 * (idempotency guard + plain console logging), adapted here for a
 * one-row identity change instead of bulk demo data.
 */
@Configuration
public class FirstAdminBootstrap {

    @Value("${app.first-admin.email:}")
    private String firstAdminEmail;

    @Bean
    public CommandLineRunner promoteFirstAdmin(UserRepository userRepository) {
        return args -> {
            if (userRepository.existsByRole(User.Role.ADMIN)) {
                return; // already have an admin — never run again
            }

            if (firstAdminEmail == null || firstAdminEmail.isBlank()) {
                System.out.println("ℹ️  No admin exists yet and FIRST_ADMIN_EMAIL is not set — "
                        + "set it to an already-registered account's email and restart auth-service to promote them.");
                return;
            }

            userRepository.findByEmail(firstAdminEmail).ifPresentOrElse(user -> {
                user.setRole(User.Role.ADMIN);
                userRepository.save(user);
                System.out.println("✅ Promoted " + firstAdminEmail + " to ADMIN (first-admin bootstrap).");
            }, () -> System.out.println("⚠️  FIRST_ADMIN_EMAIL is set to " + firstAdminEmail
                    + " but no registered account with that email exists yet — register it in the app, "
                    + "then restart auth-service."));
        };
    }
}
