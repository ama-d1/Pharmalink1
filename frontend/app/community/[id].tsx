import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, RefreshControl,
  Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import {
  CommunityPost, createPost, getCommunities,
  getCommunityPosts, joinCommunity, leaveCommunity, likePost,
} from '@/services/communityService';
import { CommentsModal } from '@/components/ui/CommentsModal';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';

// FLOW REBUILT — see the header comment in (tabs)/community.tsx for the full
// list of what was broken. The two fixes that live in *this* file:
//
//   1. Mounting this screen used to call joinCommunity() unconditionally, so
//      merely opening a group joined you to it — silently, with no way out.
//      Membership is now only ever changed by an explicit tap.
//   2. handlePost() cleared the composer before awaiting the request, so a
//      failed post silently destroyed what the user typed. The draft is now
//      only cleared after the write actually succeeds.
export default function CommunityDetailScreen() {
  const { id, name, memberCount, joined: joinedParam } =
    useLocalSearchParams<{ id: string; name: string; memberCount: string; joined?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showError, showConfirm } = useModal();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  // Seeded from the list screen so the join state is correct on first paint
  // instead of flickering; still authoritative locally after any toggle.
  const [joined, setJoined] = useState(joinedParam === '1');
  const [joinBusy, setJoinBusy] = useState(false);
  const [members, setMembers] = useState(() => parseInt(memberCount ?? '0', 10) || 0);

  const loadPosts = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setPosts(await getCommunityPosts(id, user?.userId));
    } catch (e: any) {
      setError(e?.message || 'Could not load posts');
    } finally {
      setLoading(false);
    }
  }, [id, user?.userId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // The `joined`/`memberCount` route params are only a first-paint seed from
  // the list screen — they're absent when this screen is reached any other
  // way (deep link, notification tap), which would wrongly show "Join group"
  // to someone who is already a member. community-service has no
  // single-community endpoint, so reconcile against the list, which does
  // carry an authoritative per-user `joined` flag.
  useEffect(() => {
    if (!user?.userId || !id) return;
    let cancelled = false;
    getCommunities(user.userId)
      .then((all) => {
        const match = all.find((c) => c.id === id);
        if (cancelled || !match) return;
        setJoined(!!match.joined);
        setMembers(match.memberCount);
      })
      .catch(() => {
        // Non-fatal: the seeded param value stands, and the join button
        // still works — it just may start out showing the wrong label.
      });
    return () => { cancelled = true; };
  }, [id, user?.userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const toggleMembership = async () => {
    if (!user?.userId) {
      showError('Login required', 'Please log in to join this group.');
      return;
    }

    const run = async (leaving: boolean) => {
      setJoinBusy(true);
      setJoined(!leaving);
      setMembers((m) => Math.max(0, m + (leaving ? -1 : 1)));
      try {
        if (leaving) {
          await leaveCommunity(id!, user.userId);
        } else {
          await joinCommunity(id!, user.userId);
        }
      } catch (e: any) {
        setJoined(leaving);
        setMembers((m) => Math.max(0, m + (leaving ? 1 : -1)));
        showError(leaving ? 'Could not leave' : 'Could not join', e?.message);
      } finally {
        setJoinBusy(false);
      }
    };

    if (joined) {
      // Leaving is the destructive direction — confirm it, since the button
      // sits right next to where people tap to read.
      showConfirm({
        title: `Leave ${name ?? 'this group'}?`,
        message: 'You can still read posts, but you won’t be able to post until you rejoin.',
        confirmLabel: 'Leave',
        destructive: true,
        onConfirm: () => { run(true); },
      });
      return;
    }
    run(false);
  };

  const handlePost = async () => {
    const draft = content.trim();
    if (!user?.userId || !draft || posting) return;

    setPosting(true);
    try {
      await createPost(id!, user.userId, draft);
      // Only now is it safe to discard what they typed.
      setContent('');
      if (!joined) {
        // The backend auto-enrols an author as a member (see
        // CommunityService.createPost) — mirror that here so the UI doesn't
        // keep insisting they need to join.
        setJoined(true);
        setMembers((m) => m + 1);
      }
      await loadPosts();
    } catch (e: any) {
      showError('Post failed', e?.message || 'Your draft has been kept — please try again.');
    } finally {
      setPosting(false);
    }
  };

  // Optimistic — previously every like refetched the entire feed, which threw
  // away scroll position and made a tap take a full round-trip to show.
  const handleLike = async (post: CommunityPost) => {
    if (!user?.userId) {
      showError('Login required', 'Please log in to like posts.');
      return;
    }
    const liking = !post.liked;
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, liked: liking, likes: Math.max(0, p.likes + (liking ? 1 : -1)) } : p
    ));
    try {
      await likePost(post.id, user.userId);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, liked: !liking, likes: Math.max(0, p.likes + (liking ? -1 : 1)) } : p
      ));
    }
  };

  const handleComment = (postId: string) => {
    if (!user?.userId) {
      showError('Login required', 'Please log in to comment.');
      return;
    }
    setCommentsPostId(postId);
  };

  // MVP scope (deliberately chosen over a deep-link-to-exact-post version,
  // which would need the app to handle opening straight to a specific post
  // on cold start — not built): hand off to the OS share sheet with a plain
  // text summary. No backend changes needed for this.
  const handleShare = async (post: CommunityPost) => {
    try {
      await Share.share({
        message: `${post.authorName ?? 'Someone'} in ${name ?? 'a PharmaLink community'}:\n\n"${post.content}"\n\n— Shared from PharmaLink`,
      });
    } catch {
      // Share sheet dismissed or failed silently — nothing to recover from.
    }
  };

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        onBack={() => router.back()}
        title={name ?? 'Community'}
      >
        <View style={styles.headerMeta}>
          <View style={styles.headerMetaLeft}>
            <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.headerMetaText}>{members.toLocaleString()} members</Text>
          </View>
          <TouchableOpacity
            onPress={toggleMembership}
            disabled={joinBusy}
            activeOpacity={0.7}
            style={[styles.headerJoinBtn, joined && styles.headerJoinBtnJoined, joinBusy && { opacity: 0.7 }]}
          >
            {joinBusy ? (
              <ActivityIndicator size="small" color={joined ? 'rgba(255,255,255,0.85)' : GlassTheme.colors.ink} />
            ) : (
              <>
                {joined && <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.85)" />}
                <Text style={[styles.headerJoinText, joined && styles.headerJoinTextJoined]}>
                  {joined ? 'Joined' : 'Join group'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </DarkHeader>

      <SheetBody>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
          ) : (
            <FlatList
            keyboardShouldPersistTaps="handled"
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />
              }
              ListEmptyComponent={
                error ? (
                  <View style={styles.stateCard}>
                    <Ionicons name="cloud-offline-outline" size={32} color={GlassTheme.colors.textDim} />
                    <Text style={styles.stateTitle}>Couldn&apos;t load posts</Text>
                    <Text style={styles.stateHint}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadPosts} activeOpacity={0.7}>
                      <Ionicons name="refresh" size={14} color="#FFFFFF" />
                      <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.stateCard}>
                    <Ionicons name="chatbubbles-outline" size={32} color={GlassTheme.colors.textDim} />
                    <Text style={styles.stateTitle}>No posts yet</Text>
                    <Text style={styles.stateHint}>
                      {joined ? 'Be the first to share something.' : 'Join the group to start the conversation.'}
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <View style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}>
                      <Text style={styles.postAvatarText}>{item.authorName?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.authorRow}>
                        <Text style={styles.author}>{item.authorName}</Text>
                        {item.isHealthProfessional ? (
                          <View style={styles.proBadge}>
                            <Ionicons name="medical" size={9} color={GlassTheme.colors.primary} />
                            <Text style={styles.proBadgeText}>Pharmacist</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.postRole}>
                        {item.isHealthProfessional ? 'Verified health professional' : 'Community member'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.postContent}>{item.content}</Text>

                  <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
                      <Ionicons
                        name={item.liked ? 'heart' : 'heart-outline'}
                        size={17}
                        color={item.liked ? GlassTheme.colors.rose : GlassTheme.colors.textDim}
                      />
                      <Text style={[styles.actionText, item.liked && { color: GlassTheme.colors.rose }]}>
                        {item.likes}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleComment(item.id)}>
                      <Ionicons name="chatbubble-outline" size={17} color={GlassTheme.colors.textDim} />
                      <Text style={styles.actionText}>{item.commentsCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                      <Ionicons name="share-social-outline" size={17} color={GlassTheme.colors.textDim} />
                      <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {/* ── Composer ──
              Gated on membership: non-members get a clear call to join rather
              than a text box that would silently enrol them on first post. */}
          <View style={[styles.compose, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {joined ? (
              <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="Share something with the group..."
                  placeholderTextColor={GlassTheme.colors.textDim}
                  value={content}
                  onChangeText={setContent}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  multiline
                  editable={!posting}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!content.trim() || posting) && styles.sendBtnDisabled]}
                  onPress={handlePost}
                  disabled={!content.trim() || posting}
                  activeOpacity={0.8}
                >
                  {posting
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Ionicons name="arrow-up" size={17} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.joinPrompt} onPress={toggleMembership} activeOpacity={0.8} disabled={joinBusy}>
                <Ionicons name="people-outline" size={16} color="#FFFFFF" />
                <Text style={styles.joinPromptText}>Join this group to post</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SheetBody>

      <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId}
        userId={user?.userId}
        onClose={() => setCommentsPostId(null)}
        onCommentAdded={loadPosts}
      />
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  headerMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  headerMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  headerJoinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    minWidth: 96, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: '#FFFFFF',
  },
  headerJoinBtnJoined: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerJoinText: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.ink },
  headerJoinTextJoined: { color: 'rgba(255,255,255,0.85)' },

  listContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },

  postCard: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10, gap: 10,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.primary },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  author: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: '700', color: GlassTheme.colors.primary },
  postRole: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 1 },
  postContent: { fontSize: 14, color: GlassTheme.colors.text, lineHeight: 21 },
  postActions: {
    flexDirection: 'row', gap: 22, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: GlassTheme.colors.divider,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: GlassTheme.colors.textDim, fontSize: 12, fontWeight: '600' },

  stateCard: {
    alignItems: 'center', gap: 6, paddingVertical: 44, paddingHorizontal: 28, marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  stateTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 6 },
  stateHint: { fontSize: 12, color: GlassTheme.colors.textDim, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: GlassTheme.colors.primary,
    borderRadius: GlassTheme.radius.sm,
    paddingHorizontal: 18, paddingVertical: 11, marginTop: 14,
  },
  retryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  compose: {
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surface,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  inputRowFocused: {
    borderColor: GlassTheme.colors.primary,
    backgroundColor: GlassTheme.colors.surface,
  },
  input: {
    flex: 1, fontSize: 14, color: GlassTheme.colors.text,
    maxHeight: 90, paddingVertical: 5,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: GlassTheme.colors.primary,
  },
  sendBtnDisabled: { opacity: 0.35 },

  joinPrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GlassTheme.colors.primary,
    borderRadius: GlassTheme.radius.md, paddingVertical: 14,
  },
  joinPromptText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
