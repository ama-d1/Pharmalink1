package com.pharmalink.notification_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// Phase 1 posture — permitAll, matching every other service. Includes
// /internal/** too (the notification-creation endpoint other services call)
// since, like every other internal endpoint in this system so far, its real
// protection is "no gateway route exposes it publicly" rather than
// service-level auth — see api-gateway's application.yaml comments.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/notifications/**").permitAll()
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
}
