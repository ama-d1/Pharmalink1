package com.pharmalink.pharmacy_service.controller;

import com.pharmalink.pharmacy_service.model.Review;
import com.pharmalink.pharmacy_service.security.AuthContext;
import com.pharmalink.pharmacy_service.service.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;



/**
 * Coming-soon roadmap item #2 (COMING_SOON_ROADMAP.md): "Pharmacy reviews &
 * ratings". Lives under the existing public /api/pharmacies/** prefix
 * (already permitAll at this service's SecurityConfig, gateway-routed) —
 * reviews are public-read by nature, same as pharmacy listings themselves.
 * Write endpoints (POST/DELETE) still require a real X-User-Id forwarded by
 * api-gateway's JwtAuthFilter; a request with no X-User-Id is rejected here
 * rather than silently trusting a body-supplied userId (the same
 * ownership-validation posture as every other service post-Phase-2).
 */
@RestController
@RequestMapping("/api/pharmacies/{pharmacyId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getReviews(@PathVariable String pharmacyId) {
        return ResponseEntity.ok(reviewService.getReviews(pharmacyId));
    }

    @PostMapping
    public ResponseEntity<?> upsertReview(
            @PathVariable String pharmacyId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        Object ratingRaw = body.get("rating");
        if (!(ratingRaw instanceof Number)) {
            return ResponseEntity.badRequest().body(Map.of("message", "rating is required"));
        }
        String comment = (String) body.get("comment");

        try {
            Review saved = reviewService.upsertReview(pharmacyId, userId, ((Number) ratingRaw).intValue(), comment);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<?> deleteReview(
            @PathVariable String pharmacyId,
            @PathVariable String reviewId,
            HttpServletRequest request) {

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        // Ownership check happens here (against the review's own userId),
        // not in ReviewService — mirrors how every other service in this
        // codebase splits ownership-validation (controller) from business
        // logic (service). Uses the lightweight entity lookup, not
        // getReviews(), so this doesn't trigger a wasted profile-name
        // resolution round-trip just to check who owns one row.
        try {
            Review target = reviewService.getReviewEntity(pharmacyId, reviewId);
            if (!AuthContext.isOwnerOrAdmin(request, target.getUserId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not your review"));
            }
            reviewService.deleteReview(pharmacyId, reviewId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }
}
