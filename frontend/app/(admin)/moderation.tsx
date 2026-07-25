import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { AdminReportedPost, getReportedPosts, removePost } from '@/services/adminService';

export default function AdminModerationScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<AdminReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getReportedPosts();
    setPosts(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = (post: AdminReportedPost) => {
    Alert.alert('Remove post', 'Remove this reported post from the community?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPosts((prev) => prev.filter((p) => p.id !== post.id));
          const ok = await removePost(post.id);
          if (!ok) {
            setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [...prev, post]));
            Alert.alert('Not removed', 'Could not reach the admin moderation endpoint yet — this will work once the backend route is built.');
          }
        },
      },
    ]);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Moderation</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="shield-checkmark-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>Nothing reported right now. Wired to GET /api/admin/community/reports —
                  will populate once the backend endpoint exists.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <GlassCard style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Text style={styles.postAuthor}>{item.authorName ?? 'Unknown user'}</Text>
                  <View style={styles.reportBadge}>
                    <Ionicons name="flag" size={12} color={GlassTheme.colors.danger} />
                    <Text style={styles.reportBadgeText}>{item.reportCount ?? 0} reports</Text>
                  </View>
                </View>
                <Text style={styles.postContent} numberOfLines={4}>{item.content}</Text>
                <View style={styles.postFooter}>
                  <Text style={styles.postMeta}>{item.likes ?? 0} likes · {item.commentsCount ?? 0} comments</Text>
                  <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={GlassTheme.colors.danger} />
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            )}
          />
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  list: { padding: 16, gap: 12, paddingTop: 4 },
  postCard: { gap: 8 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  reportBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GlassTheme.colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: GlassTheme.radius.pill },
  reportBadgeText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.danger },
  postContent: { fontSize: 13, color: GlassTheme.colors.text, lineHeight: 18 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  postMeta: { fontSize: 12, color: GlassTheme.colors.textMuted },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  removeText: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.danger },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
});
