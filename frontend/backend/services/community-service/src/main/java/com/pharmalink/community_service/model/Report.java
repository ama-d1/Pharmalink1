package com.pharmalink.community_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Closes the BACKEND_TODO.md gap flagged since before this service existed:
 * "there's currently no way for a post/comment to even get marked as
 * reported." Generic enough to cover both target types with one table
 * rather than a separate PostReport/CommentReport pair — targetId is just a
 * string id into whichever table targetType points at, not a real foreign
 * key (same non-FK-across-concerns pattern used throughout this system).
 */
@Entity
@Table(name = "reports", indexes = {
    @Index(name = "idx_report_target", columnList = "targetType, targetId")
})
public class Report {

    public enum TargetType { POST, COMMENT }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetType targetType;

    @Column(nullable = false)
    private String targetId;

    @Column(nullable = false)
    private String reporterId;

    private String reason;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Report() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public TargetType getTargetType() { return targetType; }
    public void setTargetType(TargetType targetType) { this.targetType = targetType; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getReporterId() { return reporterId; }
    public void setReporterId(String reporterId) { this.reporterId = reporterId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
