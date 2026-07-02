package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.model.*;
import com.PHARMALINK1.server.repository.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final CommunityPostRepository postRepository;
    private final PostLikeRepository likeRepository;
    private final PostCommentRepository commentRepository;
    private final UserRepository userRepository;

    public CommunityService(
            CommunityRepository communityRepository,
            CommunityMemberRepository memberRepository,
            CommunityPostRepository postRepository,
            PostLikeRepository likeRepository,
            PostCommentRepository commentRepository,
            UserRepository userRepository) {
        this.communityRepository = communityRepository;
        this.memberRepository = memberRepository;
        this.postRepository = postRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> getCommunities(String userId) {
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        Set<String> joined = userId == null ? Set.of() :
            memberRepository.findByUserId(userId).stream()
                .map(CommunityMember::getCommunityId).collect(Collectors.toSet());

        return communityRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            m.put("description", c.getDescription());
            m.put("icon", c.getIcon());
            m.put("color", c.getColor());
            m.put("memberCount", c.getMemberCount());
            m.put("postsToday", postRepository.countByCommunityIdAndCreatedAtAfter(c.getId(), todayStart));
            m.put("joined", joined.contains(c.getId()));
            return m;
        }).collect(Collectors.toList());
    }

    public CommunityMember joinCommunity(String communityId, String userId) {
        if (memberRepository.existsByCommunityIdAndUserId(communityId, userId)) {
            return memberRepository.findByCommunityIdAndUserId(communityId, userId).orElseThrow();
        }
        Community community = communityRepository.findById(communityId)
            .orElseThrow(() -> new RuntimeException("Community not found"));
        community.setMemberCount(community.getMemberCount() + 1);
        communityRepository.save(community);
        return memberRepository.save(new CommunityMember(communityId, userId));
    }

    public List<Map<String, Object>> getPosts(String communityId, String userId) {
        return postRepository.findByCommunityIdOrderByCreatedAtDesc(communityId).stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("communityId", p.getCommunityId());
            m.put("content", p.getContent());
            m.put("likes", p.getLikes());
            m.put("commentsCount", p.getCommentsCount());
            m.put("createdAt", p.getCreatedAt());
            m.put("liked", userId != null && likeRepository.findByPostIdAndUserId(p.getId(), userId).isPresent());
            userRepository.findById(p.getUserId()).ifPresent(u -> m.put("authorName", u.getFullName()));
            if (!m.containsKey("authorName")) m.put("authorName", "Member");
            return m;
        }).collect(Collectors.toList());
    }

    public CommunityPost createPost(String communityId, String userId, String content) {
        if (!memberRepository.existsByCommunityIdAndUserId(communityId, userId)) {
            joinCommunity(communityId, userId);
        }
        CommunityPost post = new CommunityPost();
        post.setCommunityId(communityId);
        post.setUserId(userId);
        post.setContent(content);
        return postRepository.save(post);
    }

    public CommunityPost likePost(String postId, String userId) {
        CommunityPost post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        Optional<PostLike> existing = likeRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            post.setLikes(Math.max(0, post.getLikes() - 1));
        } else {
            likeRepository.save(new PostLike(postId, userId));
            post.setLikes(post.getLikes() + 1);
        }
        return postRepository.save(post);
    }

    public PostComment commentOnPost(String postId, String userId, String content) {
        CommunityPost post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        PostComment comment = new PostComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        post.setCommentsCount(post.getCommentsCount() + 1);
        postRepository.save(post);
        return commentRepository.save(comment);
    }
}
