import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getConversationsForUser, searchPharmacists, startConversation } from '@/services/ChatClient';

type Pharmacist = { id: string; fullName: string; pharmacyName: string };

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const convos = await getConversationsForUser(user.userId);
      setConversations(convos);
    } catch { /* fallback */ }
  }, [user?.userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (search.length > 1) {
      searchPharmacists(search).then(setPharmacists).catch(() => setPharmacists([]));
    } else {
      setPharmacists([]);
    }
  }, [search]);

  const openChat = async (pharmacistId: string) => {
    if (!user?.userId) return;
    setShowSearch(false);
    setSearch('');
    try {
      const convo = await startConversation(user.userId, pharmacistId);
      router.push(`/chat/${convo.id}` as any);
    } catch {
      Alert.alert("Couldn't start chat", 'Check your connection and try again.');
    }
  };

  return (
    <GlassBackground>
      {/* light-content: the ink header runs edge-to-edge under the status
          bar (no 'top' safe-area edge below), so dark icons would be
          invisible against it. Matches every other screen's title bar. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>

        {/* ── Top Header ── */}
        <LinearGradient
          colors={GlassTheme.gradients.headerBg}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>Chat with your pharmacist</Text>
          </View>
          <TouchableOpacity
            style={styles.searchToggle}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name={showSearch ? 'close' : 'search'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Pharmacist Search ── */}
        {showSearch && (
          <View style={styles.searchPanel}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={GlassTheme.colors.textDim} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or pharmacy..."
                placeholderTextColor={GlassTheme.colors.textDim}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
                  <Ionicons name="close-circle" size={18} color={GlassTheme.colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
            {pharmacists.length > 0 && (
              <View style={styles.resultsWrap}>
                {pharmacists.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.resultItem}
                    onPress={() => openChat(p.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.resultAvatar}>
                      <Ionicons name="medical" size={18} color={GlassTheme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{p.fullName}</Text>
                      <Text style={styles.resultPharmacy}>{p.pharmacyName}</Text>
                    </View>
                    <Ionicons name="chatbubble-outline" size={16} color={GlassTheme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Conversation List ── */}
        <FlatList
            keyboardShouldPersistTaps="handled"
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            conversations.length > 0 ? (
              <Text style={styles.listLabel}>Recent Conversations</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={GlassTheme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyHint}>Search for a pharmacist above to start chatting</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInRight.delay(index * 60).duration(350)}>
              <GlassCard onPress={() => router.push(`/chat/${item.id}` as any)} style={styles.convoCard}>
                <View style={styles.convoAvatar}>
                  <Ionicons name="medical" size={22} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.convoName}>Pharmacist Chat</Text>
                  <Text style={styles.convoPreview} numberOfLines={1}>Tap to open conversation</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textDim} />
              </GlassCard>
            </Animated.View>
          )}
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
    overflow: 'hidden',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  searchToggle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  searchPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.pill,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
  },
  searchInput: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 10,
    fontSize: 14, color: GlassTheme.colors.text,
  },
  resultsWrap: {
    marginTop: 8,
    borderRadius: GlassTheme.radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: GlassTheme.colors.divider,
    overflow: 'hidden',
    ...GlassTheme.shadow.sm,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider,
  },
  resultAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  resultName: { color: GlassTheme.colors.text, fontWeight: '600', fontSize: 14 },
  resultPharmacy: { color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 2 },

  listContent: { padding: 20, gap: 10, paddingBottom: 110 },
  listLabel: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  convoCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  convoAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  convoName: { color: GlassTheme.colors.text, fontWeight: '700', fontSize: 15 },
  convoPreview: { color: GlassTheme.colors.textMuted, fontSize: 13, marginTop: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: GlassTheme.colors.text },
  emptyHint: { fontSize: 13, color: GlassTheme.colors.textMuted, textAlign: 'center', maxWidth: 240 },
});
