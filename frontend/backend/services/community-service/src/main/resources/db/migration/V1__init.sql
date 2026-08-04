-- Baseline schema for community-service (pharmalink_community), hand-derived
-- from model/Community.java, CommunityMember.java, CommunityPost.java,
-- PostComment.java, PostLike.java, and Report.java's JPA annotations. No live
-- Postgres/matching Java version was available in this sandbox to pg_dump a
-- real schema from — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE communities (
    id             VARCHAR(255) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    VARCHAR(255),
    icon           VARCHAR(255),
    color          VARCHAR(255),
    member_count   INTEGER NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE community_members (
    id             VARCHAR(255) NOT NULL,
    community_id   VARCHAR(255) NOT NULL,
    user_id        VARCHAR(255) NOT NULL,
    joined_at      TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_member_community ON community_members (community_id);
CREATE INDEX idx_member_user ON community_members (user_id);
ALTER TABLE community_members ADD CONSTRAINT uq_community_member UNIQUE (community_id, user_id);

CREATE TABLE community_posts (
    id               VARCHAR(255) NOT NULL,
    community_id     VARCHAR(255) NOT NULL,
    user_id          VARCHAR(255) NOT NULL,
    content          TEXT NOT NULL,
    likes            INTEGER NOT NULL,
    comments_count   INTEGER NOT NULL,
    created_at       TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_post_community ON community_posts (community_id);
CREATE INDEX idx_post_community_created_at ON community_posts (community_id, created_at);

CREATE TABLE post_comments (
    id           VARCHAR(255) NOT NULL,
    post_id      VARCHAR(255) NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_comment_post ON post_comments (post_id);

CREATE TABLE post_likes (
    id           VARCHAR(255) NOT NULL,
    post_id      VARCHAR(255) NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_like_post ON post_likes (post_id);
ALTER TABLE post_likes ADD CONSTRAINT uq_post_like UNIQUE (post_id, user_id);

CREATE TABLE reports (
    id            VARCHAR(255) NOT NULL,
    target_type   VARCHAR(255) NOT NULL,
    target_id     VARCHAR(255) NOT NULL,
    reporter_id   VARCHAR(255) NOT NULL,
    reason        VARCHAR(255),
    created_at    TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_report_target ON reports (target_type, target_id);
