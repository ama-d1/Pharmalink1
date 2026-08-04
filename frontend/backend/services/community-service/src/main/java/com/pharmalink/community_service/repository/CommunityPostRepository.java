package com.pharmalink.community_service.repository;

import com.pharmalink.community_service.model.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, String> {
    List<CommunityPost> findByCommunityIdOrderByCreatedAtDesc(String communityId);
    long countByCommunityIdAndCreatedAtAfter(String communityId, LocalDateTime after);
}
