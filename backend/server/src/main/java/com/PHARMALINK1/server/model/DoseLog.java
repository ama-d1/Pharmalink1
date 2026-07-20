package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dose_logs", indexes = {
    @Index(name = "idx_doselog_user",       columnList = "userId"),
    @Index(name = "idx_doselog_medication",  columnList = "medicationId")
})
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String medicationId;

    // Use @PrePersist instead of inline init — inline init runs at object
    // construction but @PrePersist runs just before the INSERT, ensuring the
    // timestamp is always set even if JPA skips the inline initialiser.
    @Column(updatable = false)
    private LocalDateTime takenAt;

    @PrePersist
    protected void onCreate() {
        takenAt = LocalDateTime.now();
    }

    public DoseLog() {}

    public DoseLog(String userId, String medicationId) {
        this.userId = userId;
        this.medicationId = medicationId;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getMedicationId() { return medicationId; }
    public LocalDateTime getTakenAt() { return takenAt; }
}
