package com.pharmalink.medication_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Moved as-is from the monolith's model/DoseLog.java — no field changes.
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
