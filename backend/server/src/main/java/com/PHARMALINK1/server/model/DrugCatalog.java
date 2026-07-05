package com.PHARMALINK1.server.model;

import jakarta.persistence.*;

@Entity
@Table(name = "drug_catalog")
public class DrugCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    private String description;
    private double price;
    private boolean inStock = true;

    public DrugCatalog() {}

    public DrugCatalog(String name, String description, double price) {
        this.name = name;
        this.description = description;
        this.price = price;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public boolean isInStock() { return inStock; }
    public void setInStock(boolean inStock) { this.inStock = inStock; }
}
