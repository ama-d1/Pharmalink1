import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { Community, getCommunities, joinCommunity } from '@/services/communityService';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  heart: 'heart',
  'happy-outline': 'happy-outline',
  fitness: 'fitness',
  ribbon: 'ribbon',
  water: 'water',
};

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    getCommunities(user?.userId).then(setCommunities).catch(() => {});
  }, [user?.userId]);

  const handleJoin = async (community: Community) => {
    if (!user?.userId) return Alert.alert('Login Required', 'Please log in to join communities.');
    await joinCommunity(community.id, user.userId);
    router.push({ pathname: '/community/[id]' as any, params: { id: community.id, name: community.name, memberCount: String(community.memberCount) } });
  };

  const totalMembers = communities.reduce((s, c) => s + c.memberCount, 0);

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerBubble1} />
              <View style={styles.headerBubble2} />
              <View style={{ zIndex: 1, alignItems: 'flex-start', width: '100%' }}>
                <Text style={styles.title}>Community</Text>
                <Text style={styles.subtitle}>Connect · Learn · Support</Text>
                <View style={styles.membersBadge}>
                  <Ionicons name="people" size={13} color="#FFFFFF" />
                  <Text style={styles.membersText}>{totalMembers.toLocaleString()} members across all groups</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Info Card ── */}
          <GlassCard gradient style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={GlassTheme.colors.primary} />
              </View>
              <Text style={styles.infoText}>
                Peer-support groups moderated by verified pharmacists. Share experiences, ask questions, stay informed.
              </Text>
            </View>
          </GlassCard>

          <Text style={styles.sectionTitle}>Popular Groups</Text>

          {communities.map((group, index) => (
            <Animated.View key={group.id} entering={FadeInDown.delay(80 + index * 60).duration(400)}>
              <GlassCard onPress={() => handleJoin(group)} style={styles.groupCard}>
                {/* colour accent strip */}
                <View style={[styles.accentStrip, { backgroundColor: group.color }]} />

                <View style={[styles.groupIcon, { backgroundColor: `${group.color}18` }]}>
                  <Ionicons name={iconMap[group.icon] ?? 'people'} size={24} color={group.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View style={styles.groupMeta}>
                    <Ionicons name="people-outline" size={12} color={GlassTheme.colors.textDim} />
                    <Text style={styles.groupMetaText}>{group.memberCount.toLocaleString()} members</Text>
                    <View style={styles.dot} />
                    <Text style={styles.groupMetaText}>{group.postsToday} posts today</Text>
                  </View>
                </View>

                <View style={[styles.joinBadge, { backgroundColor: group.joined ? GlassTheme.colors.successLight : `${group.color}18`, borderColor: group.joined ? GlassTheme.colors.success : group.color }]}>
                  <Text style={[styles.joinText, { color: group.joined ? GlassTheme.colors.success : group.color }]}>
                    {group.joined ? '✓ Joined' : 'Join'}
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ))}

        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, gap: 4 },

  header: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
  },
  headerBubble1: {
    position: 'absolute', top: -40, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerBubble2: {
    position: 'absolute', bottom: -50, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  membersBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: GlassTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 12,
  },
  membersText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  infoCard: { marginHorizontal: 20, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  infoText: { flex: 1, fontSize: 13, color: GlassTheme.colors.textMuted, lineHeight: 20 },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 10, paddingHorizontal: 20,
  },

  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginHorizontal: 20, marginBottom: 10,
    paddingLeft: 0, overflow: 'hidden',
    position: 'relative',
  },
  accentStrip: {
    width: 4, alignSelf: 'stretch', borderRadius: 0,
    marginRight: 2,
  },
  groupIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  groupName: { color: GlassTheme.colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupMetaText: { color: GlassTheme.colors.textMuted, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: GlassTheme.colors.textDim },

  joinBadge: {
    borderRadius: GlassTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5,
    marginRight: 16,
  },
  joinText: { fontSize: 12, fontWeight: '700' },
});
