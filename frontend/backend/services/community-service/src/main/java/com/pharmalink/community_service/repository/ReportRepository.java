package com.pharmalink.community_service.repository;

import com.pharmalink.community_service.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, String> {
    long countByTargetTypeAndTargetId(Report.TargetType targetType, String targetId);
    List<Report> findByTargetTypeAndTargetId(Report.TargetType targetType, String targetId);

    // All reports of a given type — grouped/counted by targetId in
    // CommunityService (not here) to build the admin reported-posts list,
    // since a "distinct" query on full entity rows wouldn't collapse
    // multiple reports of the same post (each Report has its own id).
    List<Report> findByTargetType(Report.TargetType targetType);
}
