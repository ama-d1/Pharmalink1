package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.Pharmacy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PharmacyRepository extends JpaRepository<Pharmacy, String> {
    List<Pharmacy> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String name, String address);
}
