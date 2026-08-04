package com.pharmalink.community_service.config;

import com.pharmalink.community_service.model.Community;
import com.pharmalink.community_service.repository.CommunityRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Seeds the 5 starter communities — moved verbatim from the monolith's
 * DataInitializer (which only seeds HealthTips now; that data belongs to
 * home-service's domain, not community's, so it stayed behind).
 * Idempotent: skips if data already exists.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedCommunities(CommunityRepository repo) {
        return args -> {
            if (repo.count() > 0) return;
            repo.save(new Community("Diabetes Support",    "Share tips and support for diabetes management",         "heart",        "#2563EB", 1240));
            repo.save(new Community("Mental Health",       "A safe space for mental wellness conversations",          "happy-outline","#8B5CF6", 3891));
            repo.save(new Community("Hypertension Care",   "Blood pressure management community",                    "fitness",      "#14B8A6", 2105));
            repo.save(new Community("Cancer Survivors",    "Support and stories from survivors",                     "ribbon",       "#F59E0B", 987));
            repo.save(new Community("Sickle Cell Warriors","Community for sickle cell awareness",                    "water",        "#DC2626", 1456));
            System.out.println("✅ Seeded 5 communities.");
        };
    }
}
