package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.DrugOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DrugOrderRepository extends JpaRepository<DrugOrder, String> {
    List<DrugOrder> findByUserIdOrderByCreatedAtDesc(String userId);
}
