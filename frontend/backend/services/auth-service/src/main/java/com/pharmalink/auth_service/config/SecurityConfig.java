package com.pharmalink.auth_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// Phase 1 (extraction) config only — matches the monolith's current
// permitAll posture so behavior doesn't change yet. Every route here is
// meant to be reachable only through the auth-service's own endpoints
// anyway (register/login/forgot/reset are inherently public). The real
// fix — a JWT filter that validates tokens for routes that need it — lands
// centrally at the API Gateway per MICROSERVICES_PLAN.md §5.2, tracked as a
// Phase 2 item, not duplicated here.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                // /internal/auth/** added for admin-service (step 7c) — same
                // Phase 1 posture as every other service's /internal/**:
                // "protected" only by having no gateway route, not by real
                // auth yet. See InternalAuthController javadoc.
                .requestMatchers("/internal/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );

        return http.build();
    }

    // Phase 2 (MICROSERVICES_PLAN.md §6 step 8): replaces the previous
    // @CrossOrigin(origins = "*") wildcard that used to sit on this
    // service's controller(s). This list covers local Expo dev server
    // origins only — you are currently testing on a native iPhone app,
    // where CORS (a browser-enforced mechanism) mostly does not apply
    // anyway. REPLACE/EXTEND this list with your real production domain(s)
    // before shipping a web client (admin dashboard, Expo web) that
    // actually needs it enforced.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:8081",
                "http://localhost:19000",
                "http://localhost:19006",
                "exp://localhost:19000"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
