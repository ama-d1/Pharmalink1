package com.pharmalink.home_service.service;

import com.pharmalink.home_service.client.MedicationClient;
import com.pharmalink.home_service.model.HealthTip;
import com.pharmalink.home_service.repository.HealthTipRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HomeService {

    private final HealthTipRepository healthTipRepository;
    private final MedicationClient medicationClient;

    public HomeService(HealthTipRepository healthTipRepository, MedicationClient medicationClient) {
        this.healthTipRepository = healthTipRepository;
        this.medicationClient = medicationClient;
    }

    public HealthTip getCurrentHealthTip() {
        List<HealthTip> tips = healthTipRepository.findAll();
        if (tips.isEmpty()) {
            HealthTip fallback = new HealthTip(
                "Drink at least 8 glasses of water daily to help your medications work effectively.",
                "Hydration"
            );
            return healthTipRepository.save(fallback);
        }
        // Rotate tip every 10 minutes
        long slot = System.currentTimeMillis() / (10L * 60L * 1000L);
        return tips.get((int) (slot % tips.size()));
    }

    public Map<String, Object> getHomeSummary(String userId) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("medicationCount", medicationClient.getActiveMedicationCount(userId));
        summary.put("healthTip", getCurrentHealthTip());
        return summary;
    }
}
