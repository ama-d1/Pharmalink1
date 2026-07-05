package com.PHARMALINK1.server.model;

import jakarta.persistence.*;

@Entity
@Table(name = "health_tips")
public class HealthTip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String category;

    public HealthTip() {}

    public HealthTip(String content, String category) {
        this.content = content;
        this.category = category;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
