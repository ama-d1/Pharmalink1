package com.pharmalink.admin_service.config;

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

/**
 * Phase 1 posture — permitAll, matching every other service. Worth being
 * extra explicit about the risk here: this is the highest-stakes permitAll
 * in the whole system. api-gateway's JwtAuthFilter requires SOME valid
 * token for /api/admin/** (it's not in the open-path list), but it does not
 * yet check the token's role — any authenticated PATIENT/PHARMACIST user
 * can currently reach every admin endpoint once logged in, not just real
 * admins. Real role enforcement (checking X-User-Role == ADMIN, forwarded
 * by the gateway) is a Phase 2 item, called out explicitly here rather than
 * silently left as "just another permitAll."
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/admin/**").permitAll()
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
