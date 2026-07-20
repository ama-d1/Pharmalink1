package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "community_members",
    indexes = {
        @Index(name = "idx_member_community", columnList = "communityId"),
        @Index(name = "idx_member_user",      columnList = "userId")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_community_member", columnNames = {"communityId", "userId"})
    }
)
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String communityId;

    @Column(nullable = false)
    private String userId;

    @Column(updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }

    public CommunityMember() {}

    public CommunityMember(String communityId, String userId) {
        this.communityId = communityId;
        this.userId = userId;
    }

    public String getId() { return id; }
    public String getCommunityId() { return communityId; }
    public void setCommunityId(String communityId) { this.communityId = communityId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
}
