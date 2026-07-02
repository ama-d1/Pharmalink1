package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.model.Pharmacy;
import com.PHARMALINK1.server.repository.PharmacyRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class PharmacyService {

    private final PharmacyRepository pharmacyRepository;

    public PharmacyService(PharmacyRepository pharmacyRepository) {
        this.pharmacyRepository = pharmacyRepository;
    }

    public List<Pharmacy> getAllPharmacies() {
        return pharmacyRepository.findAll();
    }

    public List<Pharmacy> searchPharmacies(String query) {
        if (query == null || query.isBlank()) return getAllPharmacies();
        return pharmacyRepository.findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(query, query);
    }
}
