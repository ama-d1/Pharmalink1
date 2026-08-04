package com.pharmalink.community_service.service;

import com.pharmalink.community_service.client.NotificationClient;
import com.pharmalink.community_service.client.ProfileClient;
import com.pharmalink.community_service.model.*;
import com.pharmalink.community_service.repository.*;
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
    private final ReportRepository reportRepository;
    private final ProfileClient profileClient;
    private final NotificationClient notificationClient;

    public CommunityService(
            CommunityRepository communityRepository,
            CommunityMemberRepository memberRepository,
            CommunityPostRepository postRepository,
            PostLikeRepository likeRepository,
            PostCommentRepository commentRepository,
            ReportRepository reportRepository,
            ProfileClient profileClient,
            NotificationClient notificationClient) {
        this.communityRepository = communityRepository;
        this.memberRepository = memberRepository;
        this.postRepository = postRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.reportRepository = reportRepository;
        this.profileClient = profileClient;
        this.notificationClient = notificationClient;
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

    /**
     * NEW — there was previously no way to undo a join, which made the
     * frontend's "Join" action a one-way door: the button could only ever
     * flip to "Joined" and stay there for the life of the account.
     *
     * Idempotent in the same spirit as joinCommunity above: leaving a
     * community you aren't in is a no-op rather than a 404, so a double-tap
     * or a retried request can't drive memberCount below the real figure.
     */
    public void leaveCommunity(String communityId, String userId) {
        Optional<CommunityMember> membership =
            memberRepository.findByCommunityIdAndUserId(communityId, userId);
        if (membership.isEmpty()) {
            return;
        }
        memberRepository.delete(membership.get());

        Community community = communityRepository.findById(communityId)
            .orElseThrow(() -> new RuntimeException("Community not found"));
        // Clamped at 0 — the counter is denormalized, so a historical drift
        // must never be able to render a negative member count.
        community.setMemberCount(Math.max(0, community.getMemberCount() - 1));
        communityRepository.save(community);
    }

    /**
     * Author names are resolved via a single batch call to user-profile-service
     * (avoids N+1 calls per post) rather than the monolith's per-row
     * UserRepository.findById lookup. Falls back to "Member" on a resolution
     * miss — same behavior as before, just sourced from a different service.
     */
    public List<Map<String, Object>> getPosts(String communityId, String userId) {
        List<CommunityPost> posts = postRepository.findByCommunityIdOrderByCreatedAtDesc(communityId);

        List<String> authorIds = posts.stream()
                .map(CommunityPost::getUserId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> namesById = profileClient.resolveNames(authorIds);
        // Badges pharmacist-authored posts as "Health Professional" — see
        // ProfileClient.resolveRoles javadoc. Any role string other than
        // "PHARMACIST" (including a missing/failed lookup) just renders no
        // badge, so this never blocks a post from showing.
        Map<String, String> rolesById = profileClient.resolveRoles(authorIds);

        return posts.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("communityId", p.getCommunityId());
            m.put("content", p.getContent());
            m.put("likes", p.getLikes());
            m.put("commentsCount", p.getCommentsCount());
            m.put("createdAt", p.getCreatedAt());
            m.put("liked", userId != null && likeRepository.findByPostIdAndUserId(p.getId(), userId).isPresent());
            m.put("authorName", namesById.getOrDefault(p.getUserId(), "Member"));
            m.put("isHealthProfessional", "PHARMACIST".equals(rolesById.get(p.getUserId())));
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
        PostComment saved = commentRepository.save(comment);

        // Coming-soon roadmap item #3: notify the post's author, unless
        // they're commenting on their own post or have turned the
        // "Community Activity" setting off. Best-effort — see
        // NotificationClient javadoc.
        if (!post.getUserId().equals(userId) && profileClient.isCommunityAlertsEnabled(post.getUserId())) {
            String commenterName = profileClient.resolveNames(List.of(userId)).getOrDefault(userId, "Someone");
            notificationClient.notifyPostComment(post.getUserId(), postId, commenterName);
        }

        return saved;
    }

    /**
     * NEW — closes the flagged BACKEND_TODO gap: there was previously no way
     * to list a post's comments (only POST existed). Author names resolved
     * the same batch way as getPosts().
     */
    public List<Map<String, Object>> getComments(String postId) {
        // Confirm the post exists so callers get a clean 404 (via the
        // controller's exception handling) instead of a silently empty list
        // for a typo'd/deleted postId.
        postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        List<PostComment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);

        List<String> authorIds = comments.stream()
                .map(PostComment::getUserId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> namesById = profileClient.resolveNames(authorIds);

        return comments.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("postId", c.getPostId());
            m.put("userId", c.getUserId());
            m.put("content", c.getContent());
            m.put("createdAt", c.getCreatedAt());
            m.put("authorName", namesById.getOrDefault(c.getUserId(), "Member"));
            return m;
        }).collect(Collectors.toList());
    }

    // ── Reporting (public) + moderation (internal, admin-service only) ─────
    // Closes the BACKEND_TODO.md gap: "no way for a post/comment to even get
    // marked as reported." See MICROSERVICES_PLAN.md §6 step 7c.

    public Report reportPost(String postId, String reporterId, String reason) {
        postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        Report report = new Report();
        report.setTargetType(Report.TargetType.POST);
        report.setTargetId(postId);
        report.setReporterId(reporterId);
        report.setReason(reason);
        return reportRepository.save(report);
    }

    public Report reportComment(String commentId, String reporterId, String reason) {
        commentRepository.findById(commentId)
            .orElseThrow(() -> new RuntimeException("Comment not found"));
        Report report = new Report();
        report.setTargetType(Report.TargetType.COMMENT);
        report.setTargetId(commentId);
        report.setReporterId(reporterId);
        report.setReason(reason);
        return reportRepository.save(report);
    }

    /**
     * Backs admin-service's GET /api/admin/community/reports, matching
     * frontend/services/adminService.ts's AdminReportedPost shape exactly.
     * Grouped/counted in Java rather than a DB-level GROUP BY — this table
     * is small (a handful of reports, not millions of rows), so simplicity
     * won here over a fancier query.
     */
    public List<Map<String, Object>> getReportedPosts() {
        List<Report> postReports = reportRepository.findByTargetType(Report.TargetType.POST);
        Map<String, Long> countByPostId = postReports.stream()
                .collect(Collectors.groupingBy(Report::getTargetId, Collectors.counting()));

        List<String> postIds = new ArrayList<>(countByPostId.keySet());
        List<CommunityPost> posts = postRepository.findAllById(postIds);

        List<String> authorIds = posts.stream().map(CommunityPost::getUserId).distinct().collect(Collectors.toList());
        Map<String, String> namesById = profileClient.resolveNames(authorIds);

        return posts.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("communityId", p.getCommunityId());
            m.put("authorName", namesById.getOrDefault(p.getUserId(), "Member"));
            m.put("content", p.getContent());
            m.put("likes", p.getLikes());
            m.put("commentsCount", p.getCommentsCount());
            m.put("reportCount", countByPostId.get(p.getId()));
            m.put("createdAt", p.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
    }

    public void deletePost(String postId) {
        CommunityPost post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        // Clean up everything referencing this post — no cascade config on
        // these relations, so this has to be done explicitly.
        for (PostComment comment : commentRepository.findByPostIdOrderByCreatedAtAsc(postId)) {
            reportRepository.deleteAll(reportRepository.findByTargetTypeAndTargetId(Report.TargetType.COMMENT, comment.getId()));
        }
        commentRepository.deleteAll(commentRepository.findByPostIdOrderByCreatedAtAsc(postId));
        reportRepository.deleteAll(reportRepository.findByTargetTypeAndTargetId(Report.TargetType.POST, postId));
        // PostLike has no findByPostId query method today — deleting the
        // post row itself is enough for the app to function (orphaned like
        // rows just point at a no-longer-existent post id and are never
        // queried directly by postId elsewhere), but this is a known minor
        // cleanup gap, not a correctness bug.
        postRepository.delete(post);
    }

    public void deleteComment(String commentId) {
        PostComment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new RuntimeException("Comment not found"));
        CommunityPost post = postRepository.findById(comment.getPostId()).orElse(null);
        if (post != null) {
            post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
            postRepository.save(post);
        }
        reportRepository.deleteAll(reportRepository.findByTargetTypeAndTargetId(Report.TargetType.COMMENT, commentId));
        commentRepository.delete(comment);
    }
}
