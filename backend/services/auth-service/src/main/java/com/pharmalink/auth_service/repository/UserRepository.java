package com.pharmalink.auth_service.repository;

import com.pharmalink.auth_service.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByResetToken(String token);
    boolean existsByEmail(String email);

    // Added 2026-08-04 (auth redesign) — phone is a login identifier now, so
    // it needs the same lookup + uniqueness treatment email already had.
    // See User.phoneNumber's javadoc for why the number is stored here at all
    // when user-profile-service also has it.
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);

    // Google sign-in. Looks up by the immutable "sub" claim, not by email —
    // see User.googleId's javadoc.
    Optional<User> findByGoogleId(String googleId);

    // Added 2026-07-23 for the first-admin bootstrap (see config/FirstAdminBootstrap.java)
    // — the idempotency check that stops it from doing anything once at
    // least one real admin already exists.
    boolean existsByRole(User.Role role);
}
