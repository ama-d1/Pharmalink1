package com.pharmalink.community_service.repository;

import com.pharmalink.community_service.model.Community;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityRepository extends JpaRepository<Community, String> {}
