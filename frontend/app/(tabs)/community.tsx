import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { Community, getCommunities, joinCommunity, leaveCommunity } from '@/services/communityService';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  heart: 'heart',
  'happy-outline': 'happy-outline',
  fitness: 'fitness',
  ribbon: 'ribbon',
  water: 'water',
};

const TABS = [
  { key: 'mine', label: 'My Groups' },
  { key: 'discover', label: 'Discover' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// FLOW REBUILT.
//
// What was wrong before:
//   1. Tapping a group card called joinCommunity() and *then* navigated, so
//      there was no way to look inside a group without becoming a member —
//      the "Join" badge was decorative, not a choice.
//   2. The detail screen ALSO auto-joined on mount, so even a back-button
//      bounce left you joined.
//   3. Nothing could ever un-join you (no endpoint existed — one has since
//      been added to community-service for this rebuild).
//   4. Every load was `.catch(() => {})`, so a backend outage rendered an
//      empty list identical to "there are no groups", with no retry.
//
// Now: tapping a card opens it read-only, joining is an explicit button, it
// toggles both ways, and load failures surface with a Retry.
export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useModal();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Which group has a join/leave request in flight — disables just that
  // button rather than blocking the whole screen.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('discover');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setCommunities(await getCommunities(user?.userId));
    } catch (e: any) {
      setError(e?.message || 'Could not load communities');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  // Refetches on focus so membership changed inside a group's detail screen
  // is reflected the moment you come back here.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Optimistic — the button flips instantly and rolls back if the request
  // fails, so a slow network doesn't make the tap feel ignored.
  const toggleMembership = async (community: Community) => {
    if (!user?.userId) {
      showError('Login required', 'Please log in to join communities.');
      return;
    }
    const joining = !community.joined;
    const delta = joining ? 1 : -1;

    setBusyId(community.id);
    setCommunities((prev) => prev.map((c) =>
      c.id === community.id
        ? { ...c, joined: joining, memberCount: Math.max(0, c.memberCount + delta) }
        : c
    ));

    try {
      if (joining) {
        await joinCommunity(community.id, user.userId);
      } else {
        await leaveCommunity(community.id, user.userId);
      }
    } catch (e: any) {
      setCommunities((prev) => prev.map((c) =>
        c.id === community.id
          ? { ...c, joined: !joining, memberCount: Math.max(0, c.memberCount - delta) }
          : c
      ));
      showError(joining ? 'Could not join' : 'Could not leave', e?.message);
    } finally {
      setBusyId(null);
    }
  };

  // Opening a group no longer implies joining it.
  const openCommunity = (community: Community) => {
    router.push({
      pathname: '/community/[id]' as any,
      params: {
        id: community.id,
        name: community.name,
        memberCount: String(community.memberCount),
        joined: community.joined ? '1' : '0',
      },
    });
  };

  const joinedCount = communities.filter((c) => c.joined).length;
  const matchesQuery = (c: Community) =>
    !query.trim() ||
    c.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
    c.description?.toLowerCase().includes(query.trim().toLowerCase());

  const listed = communities
    .filter(matchesQuery)
    .filter((c) => (tab === 'mine' ? c.joined : true));

  const renderCard = (group: Community, index: number) => {
    const color = group.color || GlassTheme.colors.primary;
    const busy = busyId === group.id;
    return (
      <Animated.View key={group.id} entering={FadeInDown.delay(index * 50).duration(280)}>
        <TouchableOpacity style={styles.card} onPress={() => openCommunity(group)} activeOpacity={0.7}>
          <View style={[styles.cardIcon, { backgroundColor: `${color}14` }]}>
            <Ionicons name={iconMap[group.icon] ?? 'people'} size={21} color={color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{group.name}</Text>
            {!!group.description && (
              <Text style={styles.cardDesc} numberOfLines={2}>{group.description}</Text>
            )}
            <View style={styles.cardMeta}>
              <Ionicons name="people-outline" size={11} color={GlassTheme.colors.textDim} />
              <Text style={styles.cardMetaText}>{group.memberCount.toLocaleString()}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.cardMetaText}>{group.postsToday} today</Text>
            </View>
          </View>

          {/* Join/Leave is its own hit target — tapping it must not also
              navigate, hence the nested Touchable + stopPropagation-by-design
              (onPress on a child isn't forwarded to the parent in RN). */}
          <TouchableOpacity
            onPress={() => toggleMembership(group)}
            disabled={busy}
            activeOpacity={0.7}
            hitSlop={6}
            style={[styles.joinBtn, group.joined && styles.joinBtnJoined, busy && styles.joinBtnBusy]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={group.joined ? GlassTheme.colors.textMuted : '#FFFFFF'} />
            ) : (
              <>
                {group.joined && <Ionicons name="checkmark" size={12} color={GlassTheme.colors.textMuted} />}
                <Text style={[styles.joinText, group.joined && styles.joinTextJoined]}>
                  {group.joined ? 'Joined' : 'Join'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        eyebrow="COMMUNITY"
        heading="Support Groups"
        search={{
          value: query,
          onChangeText: setQuery,
          placeholder: 'Search groups',
          onClear: () => setQuery(''),
        }}
      />

      <SheetBody>
        <View style={styles.tabsWrap}>
          <SegmentedTabs
            tabs={[
              { key: 'mine' as const, label: joinedCount > 0 ? `My Groups (${joinedCount})` : 'My Groups' },
              { key: 'discover' as const, label: 'Discover' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />
            }
          >
            {/* Load failure is now distinguishable from an empty list. */}
            {error ? (
              <View style={styles.stateCard}>
                <Ionicons name="cloud-offline-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.stateTitle}>Couldn&apos;t load groups</Text>
                <Text style={styles.stateHint}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={14} color="#FFFFFF" />
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : listed.length === 0 ? (
              <View style={styles.stateCard}>
                <Ionicons
                  name={tab === 'mine' ? 'people-outline' : 'search-outline'}
                  size={32}
                  color={GlassTheme.colors.textDim}
                />
                <Text style={styles.stateTitle}>
                  {query.trim()
                    ? 'No matching groups'
                    : tab === 'mine' ? 'You haven’t joined any groups' : 'No groups yet'}
                </Text>
                <Text style={styles.stateHint}>
                  {query.trim()
                    ? 'Try a different search term.'
                    : tab === 'mine'
                      ? 'Browse Discover and join one to see it here.'
                      : 'Check back soon — groups are added by the PharmaLink team.'}
                </Text>
                {tab === 'mine' && !query.trim() && (
                  <TouchableOpacity style={styles.retryBtn} onPress={() => setTab('discover')} activeOpacity={0.7}>
                    <Text style={styles.retryText}>Browse groups</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={styles.noteCard}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={GlassTheme.colors.textMuted} />
                  <Text style={styles.noteText}>
                    Peer-support groups moderated by verified pharmacists. Open one to read it — you only need to join to post.
                  </Text>
                </View>
                {listed.map(renderCard)}
              </>
            )}
          </ScrollView>
        )}
      </SheetBody>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, padding: 13, marginBottom: 14,
  },
  noteText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  cardDesc: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  cardMetaText: { fontSize: 11, color: GlassTheme.colors.textDim },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: GlassTheme.colors.textDim },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    minWidth: 72, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.primary,
  },
  joinBtnJoined: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
  },
  joinBtnBusy: { opacity: 0.7 },
  joinText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  joinTextJoined: { color: GlassTheme.colors.textMuted },

  stateCard: {
    alignItems: 'center', gap: 6, paddingVertical: 40, paddingHorizontal: 28,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  stateTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 6, textAlign: 'center' },
  stateHint: { fontSize: 12, color: GlassTheme.colors.textDim, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: GlassTheme.colors.primary,
    borderRadius: GlassTheme.radius.sm,
    paddingHorizontal: 18, paddingVertical: 11, marginTop: 14,
  },
  retryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
