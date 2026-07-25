package com.pharmalink.pharmacy_service.service;

import com.pharmalink.pharmacy_service.client.ProfileClient;
import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.model.Review;
import com.pharmalink.pharmacy_service.repository.PharmacyRepository;
import com.pharmalink.pharmacy_service.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Coming-soon roadmap item #2 (COMING_SOON_ROADMAP.md): "Pharmacy reviews &
 * ratings". Shipped open — no purchase-verification gate, see Review's
 * javadoc for why. One review per user per pharmacy (upsertReview updates
 * in place rather than creating a duplicate), editable/deletable only by
 * its author or an admin (enforced by the controller via AuthContext, not
 * here — this service trusts whatever userId it's given, same division of
 * responsibility as every other service's *Service class in this codebase).
 */
@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PharmacyRepository pharmacyRepository;
    private final ProfileClient profileClient;

    public ReviewService(ReviewRepository reviewRepository, PharmacyRepository pharmacyRepository, ProfileClient profileClient) {
        this.reviewRepository = reviewRepository;
        this.pharmacyRepository = pharmacyRepository;
        this.profileClient = profileClient;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReviews(String pharmacyId) {
        List<Review> reviews = reviewRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacyId);

        List<String> authorIds = reviews.stream()
                .map(Review::getUserId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> namesById = profileClient.resolveNames(authorIds);

        return reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("pharmacyId", r.getPharmacyId());
            m.put("userId", r.getUserId());
            m.put("authorName", namesById.getOrDefault(r.getUserId(), "Member"));
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("createdAt", r.getCreatedAt());
            m.put("updatedAt", r.getUpdatedAt());
            return m;
        }).collect(Collectors.toList());
    }

    /**
     * Create-or-update: a user can only ever have one review per pharmacy,
     * so a repeat submission edits their existing row instead of creating a
     * second one (the unique constraint on Review would reject a duplicate
     * insert anyway — this just makes that the intended, friendly path
     * rather than a 500 the frontend has to work around).
     */
    @Transactional
    public Review upsertReview(String pharmacyId, String userId, int rating, String comment) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found"));

        Review review = reviewRepository.findByPharmacyIdAndUserId(pharmacyId, userId)
                .orElseGet(Review::new);
        review.setPharmacyId(pharmacyId);
        review.setUserId(userId);
        review.setRating(rating);
        review.setComment(comment);
        Review saved = reviewRepository.save(review);

        recomputePharmacyRating(pharmacyId);
        return saved;
    }

    /**
     * Lightweight lookup for the controller's ownership check — deliberately
     * skips ProfileClient.resolveNames() (unlike getReviews()) since all the
     * caller needs here is the review's own userId, not a display name.
     */
    @Transactional(readOnly = true)
    public Review getReviewEntity(String pharmacyId, String reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        if (!review.getPharmacyId().equals(pharmacyId)) {
            throw new RuntimeException("Review not found");
        }
        return review;
    }

    @Transactional
    public void deleteReview(String pharmacyId, String reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        if (!review.getPharmacyId().equals(pharmacyId)) {
            throw new RuntimeException("Review not found");
        }
        reviewRepository.delete(review);
        recomputePharmacyRating(pharmacyId);
    }

    /**
     * Replaces the static seed rating/reviewCount with the real average once
     * actual reviews exist. If the last review for a pharmacy gets deleted,
     * rating drops to 0.0/reviewCount 0 rather than silently reverting to
     * whatever the seed value happened to be — 0.0 honestly communicates "no
     * ratings yet" instead of a fabricated number.
     */
    private void recomputePharmacyRating(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId).orElse(null);
        if (pharmacy == null) return;

        long count = reviewRepository.countByPharmacyId(pharmacyId);
        Double average = reviewRepository.averageRatingForPharmacy(pharmacyId);

        pharmacy.setReviewCount((int) count);
        pharmacy.setRating(average != null ? Math.round(average * 10.0) / 10.0 : 0.0);
        pharmacyRepository.save(pharmacy);
    }
}
