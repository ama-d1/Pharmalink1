package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, String> {
    Optional<PostLike> findByPostIdAndUserId(String postId, String userId);
    long countByPostId(String postId);
}
