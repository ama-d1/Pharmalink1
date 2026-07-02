package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "community_members")
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String communityId;

    @Column(nullable = false)
    private String userId;

    private LocalDateTime joinedAt = LocalDateTime.now();

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
}
