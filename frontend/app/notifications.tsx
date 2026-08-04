import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getPendingMedications } from '@/services/medicationService';
import { getNotifications, markNotificationRead, ServerNotification } from '@/services/notificationService';

// Merges two sources: on-device pending medication reminders (Expo local
// notifications don't have a "history" API, so these are re-derived from
// the medication schedule each load) and real server-side notifications
// from notification-service (order status, chat, community activity,
// appointment reminders — wired up now that the backend actually
// produces/serves them).
type NotificationItem = {
  id: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  read: boolean;
  serverNotificationId?: string;
};

const TYPE_ICON: Record<ServerNotification['type'], keyof typeof Ionicons.glyphMap> = {
  ORDER_STATUS: 'cart-outline',
  CHAT_MESSAGE: 'chatbubble-outline',
  COMMUNITY_ACTIVITY: 'people-outline',
  APPOINTMENT_REMINDER: 'calendar-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    try {
      const [meds, serverNotifications] = await Promise.all([
        getPendingMedications(user.userId),
        getNotifications(user.userId),
      ]);

      const medItems: NotificationItem[] = meds.map((med: any) => ({
        id: `med-${med.id}`,
        title: `Time to take ${med.name}`,
        body: `${med.dosage} · ${med.reminderTime ?? ''} · ${med.frequency ?? ''}`.trim(),
        icon: 'medkit-outline' as const,
        color: GlassTheme.colors.primary,
        read: true, // reminders don't have a read state — never show a dot
      }));

      const serverItems: NotificationItem[] = serverNotifications
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((n) => ({
          id: `srv-${n.id}`,
          title: n.title,
          body: n.body,
          icon: TYPE_ICON[n.type] ?? 'notifications-outline',
          color: n.read ? GlassTheme.colors.textDim : GlassTheme.colors.amber,
          read: n.read,
          serverNotificationId: n.id,
        }));

      setItems([...serverItems, ...medItems]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = useCallback(async (item: NotificationItem) => {
    if (!item.serverNotificationId || item.read) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: true, color: GlassTheme.colors.textDim } : i))
    );
    await markNotificationRead(item.serverNotificationId);
  }, []);

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-done-circle-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>You&apos;re all caught up — no notifications or pending reminders.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={item.serverNotificationId ? 0.7 : 1} onPress={() => handlePress(item)}>
                <GlassCard style={styles.card}>
                  <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBody}>{item.body}</Text>
                  </View>
                  {!item.read && <View style={styles.unreadDot} />}
                </GlassCard>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <Text style={styles.footerNote}>
                Pull down to refresh for new order, chat, and community updates.
              </Text>
            }
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  cardBody: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  footerNote: { textAlign: 'center', color: GlassTheme.colors.textDim, fontSize: 11, marginTop: 16, paddingHorizontal: 20, lineHeight: 16 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: GlassTheme.colors.amber },
});
