package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, String> {
    List<CommunityPost> findByCommunityIdOrderByCreatedAtDesc(String communityId);
    long countByCommunityIdAndCreatedAtAfter(String communityId, LocalDateTime after);
}
