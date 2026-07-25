package com.pharmalink.order_service.repository;

import com.pharmalink.order_service.model.DrugOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Moved as-is from the monolith's repository/DrugOrderRepository.java.
public interface DrugOrderRepository extends JpaRepository<DrugOrder, String> {
    List<DrugOrder> findByUserIdOrderByCreatedAtDesc(String userId);

    // Added 2026-07-23 for the pharmacist owner/manager dashboard — powers
    // both the order list and the revenue summary for a pharmacy's own
    // orders.
    List<DrugOrder> findByPharmacyIdOrderByCreatedAtDesc(String pharmacyId);
}
