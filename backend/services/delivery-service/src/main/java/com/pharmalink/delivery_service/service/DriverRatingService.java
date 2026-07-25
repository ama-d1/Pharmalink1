package com.pharmalink.delivery_service.service;

import com.pharmalink.delivery_service.model.Delivery;
import com.pharmalink.delivery_service.model.DriverRating;
import com.pharmalink.delivery_service.repository.DeliveryRepository;
import com.pharmalink.delivery_service.repository.DriverRatingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Roadmap: "Rate driver after delivery". Mirrors pharmacy-service's
 * ReviewService in style — one rating per delivery (upsertable), average
 * recomputed on demand rather than denormalized onto a driver record (there
 * is no Driver entity in this service to denormalize onto; driver identity
 * lives in auth-service/user-profile-service).
 */
@Service
public class DriverRatingService {

    private final DriverRatingRepository driverRatingRepository;
    private final DeliveryRepository deliveryRepository;

    public DriverRatingService(DriverRatingRepository driverRatingRepository, DeliveryRepository deliveryRepository) {
        this.driverRatingRepository = driverRatingRepository;
        this.deliveryRepository = deliveryRepository;
    }

    /**
     * Create-or-update: submitting again for the same delivery just edits
     * the existing rating (the unique constraint on deliveryId would reject
     * a duplicate insert anyway). Only the patient who placed the order can
     * rate it, and only once it's actually DELIVERED.
     */
    @Transactional
    public DriverRating submitRating(String deliveryId, String userId, int rating, String comment) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));

        if (!delivery.getUserId().equals(userId)) {
            throw new SecurityException("You may only rate your own deliveries");
        }
        if (delivery.getStatus() != Delivery.DeliveryStatus.DELIVERED) {
            throw new IllegalStateException("You can only rate a delivery after it has been delivered");
        }
        if (delivery.getDriverId() == null) {
            throw new IllegalStateException("This delivery has no assigned driver to rate");
        }

        DriverRating driverRating = driverRatingRepository.findByDeliveryId(deliveryId)
                .orElseGet(DriverRating::new);
        driverRating.setDeliveryId(deliveryId);
        driverRating.setDriverId(delivery.getDriverId());
        driverRating.setUserId(userId);
        driverRating.setRating(rating);
        driverRating.setComment(comment);
        return driverRatingRepository.save(driverRating);
    }

    @Transactional(readOnly = true)
    public DriverRating getRatingForDelivery(String deliveryId) {
        return driverRatingRepository.findByDeliveryId(deliveryId).orElse(null);
    }

    /**
     * Not called from the frontend yet — kept ready for a future
     * driver-profile display, same spirit as pharmacy-service's average
     * rating recomputation, just not persisted anywhere (no Driver entity
     * to persist onto here).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDriverAverageRating(String driverId) {
        long count = driverRatingRepository.countByDriverId(driverId);
        Double average = driverRatingRepository.averageRatingForDriver(driverId);
        return Map.of(
                "driverId", driverId,
                "averageRating", average != null ? Math.round(average * 10.0) / 10.0 : 0.0,
                "ratingCount", count
        );
    }

    /**
     * Lightweight ownership lookup for the controller's GET endpoint —
     * returns the delivery's owning userId so it can check "is this the
     * customer" without duplicating that logic here.
     */
    @Transactional(readOnly = true)
    public String getDeliveryOwnerId(String deliveryId) {
        return deliveryRepository.findById(deliveryId)
                .map(Delivery::getUserId)
                .orElse(null);
    }
}
