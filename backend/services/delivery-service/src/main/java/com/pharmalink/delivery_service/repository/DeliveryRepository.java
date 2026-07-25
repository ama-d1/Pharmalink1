package com.pharmalink.delivery_service.repository;

import com.pharmalink.delivery_service.model.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, String> {
    Optional<Delivery> findByTrackingNumber(String trackingNumber);
    List<Delivery> findByUserIdOrderByCreatedAtDesc(String userId);

    // Added 2026-07-23 for the driver-facing "available deliveries" pool —
    // any PENDING (unassigned) delivery, newest first, is fair game for any
    // online driver to accept.
    List<Delivery> findByStatusOrderByCreatedAtDesc(Delivery.DeliveryStatus status);

    // Added 2026-07-23 — a driver's own deliveries, so their home screen can
    // show "your current delivery" persistently (survives app restarts,
    // unlike keeping it only in React state).
    List<Delivery> findByDriverIdOrderByCreatedAtDesc(String driverId);

    // Added 2026-07-23 — the actual "accept" operation, done as a single
    // atomic conditional UPDATE (not read-then-write in Java) specifically
    // so two drivers tapping "Accept" on the same delivery within
    // milliseconds of each other can't both win: only the request that hits
    // this row while it's still PENDING actually changes anything, the
    // WHERE clause is the race guard. Returns the number of rows changed —
    // 0 means someone else already claimed it (or it doesn't exist), 1 means
    // this caller won. Bulk JPQL updates bypass @PreUpdate, so updatedAt is
    // set explicitly here.
    // Enum values passed as bind parameters (not JPQL literals) deliberately
    // — JPQL's syntax for literal references to a nested enum type is easy
    // to get subtly wrong; binding avoids that entirely. Callers always pass
    // DeliveryStatus.ASSIGNED / DeliveryStatus.PENDING.
    @Modifying
    @Transactional
    @Query("UPDATE Delivery d SET d.status = :assignedStatus, d.driverId = :driverId, d.driverName = :driverName, " +
           "d.driverPhone = :driverPhone, d.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE d.id = :id AND d.status = :pendingStatus")
    int claimDelivery(@Param("id") String id, @Param("driverId") String driverId,
                       @Param("driverName") String driverName, @Param("driverPhone") String driverPhone,
                       @Param("assignedStatus") Delivery.DeliveryStatus assignedStatus,
                       @Param("pendingStatus") Delivery.DeliveryStatus pendingStatus);
}
