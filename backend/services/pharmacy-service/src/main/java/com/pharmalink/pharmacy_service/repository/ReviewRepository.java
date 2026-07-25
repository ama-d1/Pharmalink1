package com.pharmalink.pharmacy_service.repository;

import com.pharmalink.pharmacy_service.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findByPharmacyIdOrderByCreatedAtDesc(String pharmacyId);

    Optional<Review> findByPharmacyIdAndUserId(String pharmacyId, String userId);

    long countByPharmacyId(String pharmacyId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.pharmacyId = :pharmacyId")
    Double averageRatingForPharmacy(@Param("pharmacyId") String pharmacyId);
}
