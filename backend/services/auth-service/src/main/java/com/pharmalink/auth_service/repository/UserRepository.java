package com.pharmalink.auth_service.repository;

import com.pharmalink.auth_service.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByResetToken(String token);
    boolean existsByEmail(String email);

    // Added 2026-07-23 for the first-admin bootstrap (see config/FirstAdminBootstrap.java)
    // — the idempotency check that stops it from doing anything once at
    // least one real admin already exists.
    boolean existsByRole(User.Role role);
}
