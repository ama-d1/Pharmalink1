import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityPost, createPost,
  getCommunityPosts, joinCommunity, likePost,
} from '@/services/communityService';
import { CommentsModal } from '@/components/ui/CommentsModal';

export default function CommunityDetailScreen() {
  const { id, name, memberCount } = useLocalSearchParams<{ id: string; name: string; memberCount: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState('');
  const [focused, setFocused] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const loadPosts = () => {
    if (!id) return;
    getCommunityPosts(id, user?.userId).then(setPosts).catch(() => {});
  };

  useEffect(() => {
    if (user?.userId && id) joinCommunity(id, user.userId).catch(() => {});
    loadPosts();
  }, [id, user?.userId]);

  const handlePost = async () => {
    if (!user?.userId || !content.trim()) return;
    await createPost(id!, user.userId, content.trim());
    setContent('');
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    if (!user?.userId) return;
    await likePost(postId, user.userId);
    loadPosts();
  };

  const handleComment = (postId: string) => {
    if (!user?.userId) return Alert.alert('Login Required', 'Please log in to comment.');
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
    <GlassBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <LinearGradient
          colors={GlassTheme.gradients.headerBg}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title} numberOfLines={1}>{name ?? 'Community'}</Text>
            {memberCount ? (
              <View style={styles.memberChip}>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.memberChipText}>{parseInt(memberCount).toLocaleString()} members</Text>
              </View>
            ) : null}
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* ── Posts ── */}
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <GlassCard variant="flat" style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={36} color={GlassTheme.colors.textDim} style={{ alignSelf: 'center' }} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyHint}>Be the first to share something!</Text>
            </GlassCard>
          }
          renderItem={({ item }) => (
            <GlassCard style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}>
                  <Text style={styles.postAvatarText}>{item.authorName?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.authorRow}>
                    <Text style={styles.author}>{item.authorName}</Text>
                    {item.isHealthProfessional ? (
                      <View style={styles.proBadge}>
                        <Ionicons name="medical" size={10} color={GlassTheme.colors.primary} />
                        <Text style={styles.proBadgeText}>Health Professional</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.postTime}>
                    {item.isHealthProfessional ? 'Pharmacist' : 'Community Member'}
                  </Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={16} color={GlassTheme.colors.textDim} />
              </View>
              <Text style={styles.postContent}>{item.content}</Text>
              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
                  <Ionicons
                    name={item.liked ? 'heart' : 'heart-outline'}
                    size={18}
                    color={item.liked ? GlassTheme.colors.rose : GlassTheme.colors.textDim}
                  />
                  <Text style={[styles.actionText, item.liked && { color: GlassTheme.colors.rose }]}>
                    {item.likes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleComment(item.id)}>
                  <Ionicons name="chatbubble-outline" size={18} color={GlassTheme.colors.primary} />
                  <Text style={[styles.actionText, { color: GlassTheme.colors.primary }]}>
                    {item.commentsCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                  <Ionicons name="share-social-outline" size={18} color={GlassTheme.colors.textDim} />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
        />

        {/* ── Compose Bar ── */}
        <View style={styles.compose}>
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
            />
            <TouchableOpacity
              style={[styles.sendBtn, !content.trim() && styles.sendBtnDisabled]}
              onPress={handlePost}
              disabled={!content.trim()}
            >
              <LinearGradient
                colors={GlassTheme.gradients.headerBg}
                style={[StyleSheet.absoluteFill, { borderRadius: GlassTheme.radius.pill }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId}
        userId={user?.userId}
        onClose={() => setCommentsPostId(null)}
        onCommentAdded={loadPosts}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3,
  },
  memberChipText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  listContent: { padding: 16, gap: 12, paddingBottom: 100 },

  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { color: GlassTheme.colors.textMuted, fontSize: 15, fontWeight: '600' },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 13 },

  postCard: { gap: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.primary },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  author: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 10, fontWeight: '700', color: GlassTheme.colors.primary },
  postTime: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 1 },
  postContent: { fontSize: 14, color: GlassTheme.colors.textMuted, lineHeight: 22 },
  postActions: { flexDirection: 'row', gap: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: GlassTheme.colors.divider },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionText: { color: GlassTheme.colors.textDim, fontSize: 13, fontWeight: '600' },

  compose: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: GlassTheme.colors.divider,
    padding: 12,
    ...GlassTheme.shadow.lg,
    shadowOffset: { width: 0, height: -2 },
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.lg,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  inputRowFocused: {
    borderColor: GlassTheme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, fontSize: 14, color: GlassTheme.colors.text,
    maxHeight: 90, paddingVertical: 4,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
