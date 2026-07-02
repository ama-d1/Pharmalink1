package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.DoseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoseLogRepository extends JpaRepository<DoseLog, String> {
    List<DoseLog> findByUserIdOrderByTakenAtDesc(String userId);
    long countByUserId(String userId);
}
