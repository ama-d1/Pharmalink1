package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "post_likes")
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String postId;

    @Column(nullable = false)
    private String userId;

    private LocalDateTime createdAt = LocalDateTime.now();

    public PostLike() {}

    public PostLike(String postId, String userId) {
        this.postId = postId;
        this.userId = userId;
    }

    public String getId() { return id; }
    public String getPostId() { return postId; }
    public String getUserId() { return userId; }
}
