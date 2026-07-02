package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.model.CommunityMember;
import com.PHARMALINK1.server.model.CommunityPost;
import com.PHARMALINK1.server.model.PostComment;
import com.PHARMALINK1.server.service.CommunityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
@CrossOrigin(origins = "*")
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
    public ResponseEntity<CommunityMember> join(@PathVariable String communityId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(communityService.joinCommunity(communityId, body.get("userId")));
    }

    @GetMapping("/{communityId}/posts")
    public ResponseEntity<List<Map<String, Object>>> getPosts(
            @PathVariable String communityId,
            @RequestParam(required = false) String userId) {
        return ResponseEntity.ok(communityService.getPosts(communityId, userId));
    }

    @PostMapping("/{communityId}/posts")
    public ResponseEntity<CommunityPost> createPost(
            @PathVariable String communityId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(communityService.createPost(communityId, body.get("userId"), body.get("content")));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<CommunityPost> likePost(@PathVariable String postId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(communityService.likePost(postId, body.get("userId")));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<PostComment> comment(@PathVariable String postId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(communityService.commentOnPost(postId, body.get("userId"), body.get("content")));
    }
}
