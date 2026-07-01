package com.PHARMALINK1.server.service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.PHARMALINK1.server.dto.AuthResponse;
import com.PHARMALINK1.server.dto.LoginRequest;
import com.PHARMALINK1.server.dto.RegisterRequest;
import com.PHARMALINK1.server.model.User;
import com.PHARMALINK1.server.repository.UserRepository;
import com.PHARMALINK1.server.security.JwtService;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(User.Role.PATIENT);
        user.setEnabled(true);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole().name(),
            "Registration successful"
        );
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        if (!user.isEnabled()) {
            throw new RuntimeException("Account is disabled");
        }

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole().name(),
            "Login successful"
        );
    }
}