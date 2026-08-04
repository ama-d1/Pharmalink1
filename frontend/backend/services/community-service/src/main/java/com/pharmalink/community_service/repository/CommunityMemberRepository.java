package com.pharmalink.community_service.repository;

import com.pharmalink.community_service.model.CommunityMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, String> {
    List<CommunityMember> findByUserId(String userId);
    Optional<CommunityMember> findByCommunityIdAndUserId(String communityId, String userId);
    boolean existsByCommunityIdAndUserId(String communityId, String userId);
}
