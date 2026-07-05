package com.PHARMALINK1.server.service;
import java.time.LocalDateTime;
import java.util.UUID;

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
private EmailService emailService;

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
    public void forgotPassword(String email){


User user =
userRepository.findByEmail(email)
.orElseThrow(
()->new RuntimeException("Email does not exist")
);



String token =
UUID.randomUUID().toString();



user.setResetToken(token);


user.setResetTokenExpiry(
LocalDateTime.now().plusMinutes(30)
);



userRepository.save(user);



emailService.sendResetEmail(
email,
token
);


}
public void resetPassword(
String token,
String password
){


User user =
userRepository.findByResetToken(token)
.orElseThrow(
()->new RuntimeException("Invalid token")
);



if(user.getResetTokenExpiry()
.isBefore(LocalDateTime.now())){


throw new RuntimeException(
"Token expired"
);

}



user.setPassword(
passwordEncoder.encode(password)
);


user.setResetToken(null);

user.setResetTokenExpiry(null);



userRepository.save(user);


}
public void sendResetPasswordEmail(String email){

    User user = userRepository.findByEmail(email)
            .orElseThrow(
                () -> new RuntimeException("Email not found")
            );


    System.out.println(
        "RESET EMAIL FOR: " + user.getEmail()
    );

}
}