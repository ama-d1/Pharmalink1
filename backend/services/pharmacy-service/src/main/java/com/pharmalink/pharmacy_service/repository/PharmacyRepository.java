package com.pharmalink.pharmacy_service.repository;

import com.pharmalink.pharmacy_service.model.Pharmacy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

// Moved as-is from the monolith's repository/PharmacyRepository.java.
public interface PharmacyRepository extends JpaRepository<Pharmacy, String> {

    List<Pharmacy> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String name, String address);

    List<Pharmacy> findByCityIgnoreCase(String city);

    List<Pharmacy> findByRegionIgnoreCase(String region);

    List<Pharmacy> findByOpenTrue();

    List<Pharmacy> findByVerifiedTrue();

    @Query("""
        SELECT p FROM Pharmacy p
        WHERE p.rating >= :minRating
        ORDER BY p.rating DESC
        """)
    List<Pharmacy> findByMinRating(@Param("minRating") double minRating);

    @Query(value = """
        SELECT * FROM (
            SELECT *, (
                6371 * acos(
                    LEAST(1.0, cos(radians(:lat)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(:lng)) +
                    sin(radians(:lat)) * sin(radians(latitude)))
                )
            ) AS distance
            FROM pharmacies
        ) AS sub
        WHERE sub.distance < :radiusKm
        ORDER BY sub.distance
        """, nativeQuery = true)
    List<Pharmacy> findNearby(
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("radiusKm") double radiusKm
    );

    @Query("""
        SELECT p FROM Pharmacy p
        WHERE (LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(p.address) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(p.city) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(p.region) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    List<Pharmacy> fullTextSearch(@Param("query") String query);
}
