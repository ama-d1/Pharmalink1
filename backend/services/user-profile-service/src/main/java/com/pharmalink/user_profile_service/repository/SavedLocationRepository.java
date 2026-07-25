package com.pharmalink.user_profile_service.repository;

import com.pharmalink.user_profile_service.model.SavedLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SavedLocationRepository extends JpaRepository<SavedLocation, String> {

    List<SavedLocation> findByUserIdOrderByIsDefaultDescNameAsc(String userId);

    // Backs GET /api/profile/locations/search?q=... — a shared address-book
    // style lookup across every saved location (not scoped to one user),
    // matching the frontend's original intent for `searchLocations(query)`
    // (no userId param was ever passed to it). Case-insensitive substring
    // match against name/address/city, same fields the frontend's own local
    // POPULAR_LOCATIONS fallback filters on.
    @Query("SELECT l FROM SavedLocation l WHERE " +
           "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(l.address) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(l.city) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<SavedLocation> search(@Param("q") String query);
}
