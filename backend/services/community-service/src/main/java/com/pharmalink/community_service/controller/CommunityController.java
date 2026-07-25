package com.pharmalink.community_service.controller;

import com.pharmalink.community_service.model.CommunityMember;
import com.pharmalink.community_service.model.CommunityPost;
import com.pharmalink.community_service.model.PostComment;
import com.pharmalink.community_service.security.AuthContext;
import com.pharmalink.community_service.service.CommunityService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

// Phase 2 (step 8): every mutation that takes a userId in its body now
// checks that userId against the caller (AuthContext.isOwnerOrAdmin) —
// otherwise anyone could join/post/like/comment/report as anyone else just
// by putting a different userId in the request body. Read endpoints
// (getCommunities/getPosts/getComments) take an OPTIONAL userId only to
// compute a "joined"/"liked" flag for display — not enforced, since a wrong
// value there just shows the wrong flag to the caller themselves, not a
// real access to someone else's data.
@RestController
@RequestMapping("/api/community")
public class CommunityController {

    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getCommunities(@RequestParam(required = false) String userId) {
        return ResponseEntity.ok(communityService.getCommunities(userId));
    }

    @PostMapping("/{communityId}/join")
    public ResponseEntity<?> join(@PathVariable String communityId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        return ResponseEntity.ok(communityService.joinCommunity(communityId, body.get("userId")));
    }

    @GetMapping("/{communityId}/posts")
    public ResponseEntity<List<Map<String, Object>>> getPosts(
            @PathVariable String communityId,
            @RequestParam(required = false) String userId) {
        return ResponseEntity.ok(communityService.getPosts(communityId, userId));
    }

    @PostMapping("/{communityId}/posts")
    public ResponseEntity<?> createPost(
            @PathVariable String communityId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        return ResponseEntity.ok(communityService.createPost(communityId, body.get("userId"), body.get("content")));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<?> likePost(@PathVariable String postId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        return ResponseEntity.ok(communityService.likePost(postId, body.get("userId")));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<?> comment(@PathVariable String postId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        return ResponseEntity.ok(communityService.commentOnPost(postId, body.get("userId"), body.get("content")));
    }

    // NEW — closes the flagged BACKEND_TODO gap: previously only POST existed
    // for comments, with no way to list a post's comment thread. Frontend's
    // CommentsModal is already built to consume this exact route.
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<Map<String, Object>>> getComments(@PathVariable String postId) {
        return ResponseEntity.ok(communityService.getComments(postId));
    }

    // NEW — closes the other flagged BACKEND_TODO gap: "no way for a
    // post/comment to even get marked as reported." Public (any user can
    // report), unlike the moderation actions themselves, which live behind
    // /internal/community/** for admin-service only.
    @PostMapping("/posts/{postId}/report")
    public ResponseEntity<?> reportPost(@PathVariable String postId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        try {
            communityService.reportPost(postId, body.get("userId"), body.get("reason"));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/comments/{commentId}/report")
    public ResponseEntity<?> reportComment(
            @PathVariable String postId,
            @PathVariable String commentId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, body.get("userId"))) return forbidden();
        try {
            communityService.reportComment(commentId, body.get("userId"), body.get("reason"));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "You may only act as yourself"));
    }
}
