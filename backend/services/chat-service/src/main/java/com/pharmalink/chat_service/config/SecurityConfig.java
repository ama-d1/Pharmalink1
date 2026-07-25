package com.pharmalink.chat_service.config;

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

// Phase 1 (extraction) posture -- permitAll, matching the monolith's current
// behavior. Real JWT validation for /api/chat/** lands centrally at the API
// Gateway (MICROSERVICES_PLAN.md sec 5.2), and per-request ownership checks
// were added on top of that in Phase 2 step 8 (see AuthContext usage in
// ChatController). /ws/** stays permitAll here on purpose -- Spring
// Security's HTTP filter chain only ever sees the initial WebSocket upgrade
// request, not the individual STOMP frames that follow inside that
// connection, so this permitAll doesn't skip auth for the socket, it just
// means the real enforcement point is elsewhere: StompAuthChannelInterceptor,
// registered on the STOMP inbound channel in WebSocketConfig, checks the JWT
// at CONNECT and participant-ship at SUBSCRIBE (Phase 2 step 8, done).
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/chat/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
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
