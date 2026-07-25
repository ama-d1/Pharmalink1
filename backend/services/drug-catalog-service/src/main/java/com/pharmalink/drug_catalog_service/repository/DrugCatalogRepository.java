package com.pharmalink.drug_catalog_service.repository;

import com.pharmalink.drug_catalog_service.model.DrugCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Moved as-is from the monolith's repository/DrugCatalogRepository.java.
public interface DrugCatalogRepository extends JpaRepository<DrugCatalog, String> {
    List<DrugCatalog> findByInStockTrue();
}
