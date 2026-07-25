import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { AdminOrder, getAllOrdersAdmin } from '@/services/adminService';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: GlassTheme.colors.amberLight, text: GlassTheme.colors.warning },
  CONFIRMED: { bg: GlassTheme.colors.primaryLight, text: GlassTheme.colors.primary },
  OUT_FOR_DELIVERY: { bg: GlassTheme.colors.accentLight, text: GlassTheme.colors.accentSoft },
  DELIVERED: { bg: GlassTheme.colors.successLight, text: GlassTheme.colors.success },
  CANCELLED: { bg: GlassTheme.colors.dangerLight, text: GlassTheme.colors.danger },
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { orders: data, error: err } = await getAllOrdersAdmin();
    setOrders(data);
    setError(err);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Oversight</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={32} color={GlassTheme.colors.danger} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="cart-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>No orders yet.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const colors = STATUS_COLORS[item.orderStatus] ?? STATUS_COLORS.PENDING;
              return (
                <GlassCard style={styles.orderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>Order #{item.id}</Text>
                    <Text style={styles.orderMeta}>User {item.userId} · GHS {item.totalAmount?.toFixed(2)}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.badgeText, { color: colors.text }]}>{item.orderStatus}</Text>
                      </View>
                      <View style={[styles.badge, item.paymentStatus === 'PAID' ? styles.paidBadge : styles.unpaidBadge]}>
                        <Text style={item.paymentStatus === 'PAID' ? styles.paidText : styles.unpaidText}>
                          {item.paymentStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              );
            }}
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
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderId: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  orderMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: GlassTheme.radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  paidBadge: { backgroundColor: GlassTheme.colors.successLight },
  unpaidBadge: { backgroundColor: GlassTheme.colors.dangerLight },
  paidText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.success },
  unpaidText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.danger },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  retryBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: GlassTheme.radius.pill, backgroundColor: GlassTheme.colors.primaryLight },
  retryText: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.primary },
});
