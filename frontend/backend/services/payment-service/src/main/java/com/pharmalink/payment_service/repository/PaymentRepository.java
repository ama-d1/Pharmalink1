package com.pharmalink.payment_service.repository;

import com.pharmalink.payment_service.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByOurReference(String ourReference);
    List<Payment> findByOrderIdOrderByCreatedAtDesc(String orderId);
}
