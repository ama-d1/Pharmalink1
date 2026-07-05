package com.PHARMALINK1.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dose_logs")
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String medicationId;

    private LocalDateTime takenAt = LocalDateTime.now();

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
