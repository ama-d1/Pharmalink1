package com.pharmalink.pharmacy_service.repository;

import com.pharmalink.pharmacy_service.model.PharmacyStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PharmacyStockRepository extends JpaRepository<PharmacyStock, String> {
    List<PharmacyStock> findByPharmacyId(String pharmacyId);
    Optional<PharmacyStock> findByPharmacyIdAndDrugId(String pharmacyId, String drugId);

    // Case-insensitive partial match, backing the cross-pharmacy price
    // comparison search — mirrors drug-catalog-service's own search-by-name
    // behavior style, adapted to a JPA derived query since this table is
    // small enough not to need a custom @Query yet.
    List<PharmacyStock> findByDrugNameContainingIgnoreCase(String drugName);
}
