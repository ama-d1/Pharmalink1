package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "post_likes",
    indexes = { @Index(name = "idx_like_post", columnList = "postId") },
    uniqueConstraints = { @UniqueConstraint(name = "uq_post_like", columnNames = {"postId", "userId"}) }
)
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String postId;

    @Column(nullable = false)
    private String userId;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public PostLike() {}

    public PostLike(String postId, String userId) {
        this.postId = postId;
        this.userId = userId;
    }

    public String getId() { return id; }
    public String getPostId() { return postId; }
    public String getUserId() { return userId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
