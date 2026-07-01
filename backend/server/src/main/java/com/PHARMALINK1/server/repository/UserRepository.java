package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByResetToken(String token);
    boolean existsByEmail(String email);
}