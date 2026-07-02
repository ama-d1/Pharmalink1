package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.model.HealthTip;
import com.PHARMALINK1.server.repository.HealthTipRepository;
import com.PHARMALINK1.server.repository.MedicationRepository;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HomeService {

    private final HealthTipRepository healthTipRepository;
    private final MedicationRepository medicationRepository;

    public HomeService(HealthTipRepository healthTipRepository, MedicationRepository medicationRepository) {
        this.healthTipRepository = healthTipRepository;
        this.medicationRepository = medicationRepository;
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
        long slot = System.currentTimeMillis() / (10L * 60L * 1000L);
        return tips.get((int) (slot % tips.size()));
    }

    public Map<String, Object> getHomeSummary(String userId) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("medicationCount", medicationRepository.countByUserIdAndStatus(userId, com.PHARMALINK1.server.model.Medication.Status.ACTIVE));
        summary.put("healthTip", getCurrentHealthTip());
        return summary;
    }
}
