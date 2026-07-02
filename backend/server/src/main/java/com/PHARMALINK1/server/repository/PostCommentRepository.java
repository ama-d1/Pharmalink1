package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, String> {
    List<PostComment> findByPostIdOrderByCreatedAtAsc(String postId);
    long countByPostId(String postId);
}
