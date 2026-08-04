package com.pharmalink.community_service.repository;

import com.pharmalink.community_service.model.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, String> {
    List<PostComment> findByPostIdOrderByCreatedAtAsc(String postId);
    long countByPostId(String postId);
}
