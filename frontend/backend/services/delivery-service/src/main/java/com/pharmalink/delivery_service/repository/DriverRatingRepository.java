package com.pharmalink.delivery_service.repository;

import com.pharmalink.delivery_service.model.DriverRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DriverRatingRepository extends JpaRepository<DriverRating, String> {
    Optional<DriverRating> findByDeliveryId(String deliveryId);

    List<DriverRating> findByDriverId(String driverId);

    @Query("SELECT AVG(r.rating) FROM DriverRating r WHERE r.driverId = :driverId")
    Double averageRatingForDriver(@Param("driverId") String driverId);

    long countByDriverId(String driverId);
}
