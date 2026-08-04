package com.pharmalink.community_service.controller;

import com.pharmalink.community_service.service.CommunityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Service-to-service only — backs admin-service's community moderation
 * screen. Deliberately NOT under /api/community/**: that prefix is public,
 * gateway-routed, and permitAll at this service's own SecurityConfig, so a
 * "delete anyone's post" endpoint living there would be callable by any
 * authenticated user, not just admins. No gateway route exists for
 * /internal/**, so this is unreachable from outside.
 */
@RestController
@RequestMapping("/internal/community")
public class InternalCommunityController {

    private final CommunityService communityService;

    public InternalCommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getReportedPosts() {
        return ResponseEntity.ok(communityService.getReportedPosts());
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable String postId) {
        try {
            communityService.deletePost(postId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable String commentId) {
        try {
            communityService.deleteComment(commentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }
}
