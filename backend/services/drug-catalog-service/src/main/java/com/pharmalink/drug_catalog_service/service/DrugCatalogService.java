package com.pharmalink.drug_catalog_service.service;

import com.pharmalink.drug_catalog_service.repository.DrugCatalogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Moved as-is from the monolith's service/DrugCatalogService.java.
@Service
public class DrugCatalogService {

    private final DrugCatalogRepository drugCatalogRepository;

    public DrugCatalogService(DrugCatalogRepository drugCatalogRepository) {
        this.drugCatalogRepository = drugCatalogRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCatalog() {
        return drugCatalogRepository.findByInStockTrue().stream()
            .map(d -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          d.getId());
                m.put("name",        d.getName());
                m.put("description", d.getDescription() != null ? d.getDescription() : "");
                m.put("price",       d.getPrice());
                m.put("inStock",     d.isInStock());
                return m;
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, String>> getLocalSuggestions(String query, int limit) {
        String lower = query.toLowerCase();
        return drugCatalogRepository.findAll().stream()
            .filter(d -> d.getName().toLowerCase().contains(lower))
            .limit(limit)
            .map(d -> {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("id",     d.getId());
                m.put("name",   d.getName());
                m.put("source", "local");
                return m;
            })
            .collect(Collectors.toCollection(ArrayList::new));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchLocal(String query) {
        String lower = query.toLowerCase();
        return drugCatalogRepository.findAll().stream()
            .filter(d -> d.getName().toLowerCase().contains(lower)
                      || (d.getDescription() != null && d.getDescription().toLowerCase().contains(lower)))
            .map(d -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          d.getId());
                m.put("name",        d.getName());
                m.put("genericName", d.getName());
                m.put("purpose",     d.getDescription() != null ? d.getDescription() : "");
                m.put("price",       d.getPrice());
                m.put("inStock",     d.isInStock());
                m.put("source",      "local");
                return m;
            })
            .collect(Collectors.toList());
    }
}
