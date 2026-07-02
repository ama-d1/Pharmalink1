package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.DrugCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DrugCatalogRepository extends JpaRepository<DrugCatalog, String> {
    List<DrugCatalog> findByInStockTrue();
}
