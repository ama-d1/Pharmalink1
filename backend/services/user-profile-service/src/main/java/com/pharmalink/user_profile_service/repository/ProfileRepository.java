package com.pharmalink.user_profile_service.repository;

import com.pharmalink.user_profile_service.model.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProfileRepository extends JpaRepository<Profile, String> {

    // Added during chat-service extraction (step 5b) — replaces the
    // monolith's UserRepository.findByRoleAndPharmacyId /
    // findByRoleAndFullNameContainingIgnoreCase, which chat-service used to
    // call directly before role/pharmacy data lived in two different
    // services. findAllById(Iterable<String>) is inherited from
    // JpaRepository and used for the batch name lookup — no custom method
    // needed for that.
    List<Profile> findByRoleAndPharmacyId(String role, String pharmacyId);

    List<Profile> findByRoleAndFullNameContainingIgnoreCase(String role, String name);
}
