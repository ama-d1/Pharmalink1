package com.PHARMALINK1.server.repository;

import com.PHARMALINK1.server.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findByUserIdOrderByAppointmentDateAsc(String userId);
    long countByUserId(String userId);
}
