import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/services/profileService';
import {
  acceptDelivery,
  DeliveryStatus,
  getAvailableDeliveries,
  getDriverDeliveries,
  updateDeliveryLocation,
  updateDeliveryStatus,
} from '@/services/deliveryService';

// New 2026-07-23 — the driver-facing side of the delivery system. Per your
// description: drivers get notified of pending deliveries, can accept or
// reject, and carry out the ones they accept. "Notified" here means polling
// GET /api/delivery/available every few seconds while idle (no push
// notifications wired up yet — that's a bigger, separate piece involving
// APNs/FCM, flagged as a gap, not silently faked). Accepting is a race
// against every other online driver — see backend's
// DeliveryRepository.claimDelivery javadoc for how that's kept safe.
const POLL_INTERVAL_MS = 8000;
const LOCATION_PING_INTERVAL_MS = 15000;

// Non-terminal statuses — a delivery in one of these is this driver's
// "current" job; DELIVERED/CANCELLED means it's done and shouldn't block
// them from seeing new available deliveries.
const ACTIVE_STATUSES: DeliveryStatus['status'][] = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];

const STATUS_LABEL: Record<DeliveryStatus['status'], string> = {
  PENDING: 'Pending', ASSIGNED: 'Assigned to you', PICKED_UP: 'Picked up',
  IN_TRANSIT: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

// The next status this driver can advance to, or null if there's no further
// step for them to take (DELIVERED is the end of the line).
const NEXT_STATUS: Partial<Record<DeliveryStatus['status'], 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'>> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

export default function DriverHome() {
  const router = useRouter();
  const { user, clearSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState<DeliveryStatus[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryStatus | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  const driverProfileRef = useRef<{ fullName: string; phoneNumber: string } | null>(null);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    try {
      if (!driverProfileRef.current) {
        const profile = await getProfile(user.userId);
        driverProfileRef.current = { fullName: profile.fullName, phoneNumber: profile.phoneNumber };
      }

      const mine = await getDriverDeliveries(user.userId);
      const current = mine.find((d) => ACTIVE_STATUSES.includes(d.status)) ?? null;
      setActiveDelivery(current);

      if (!current) {
        const pool = await getAvailableDeliveries();
        setAvailable(pool.filter((d) => !dismissedIds.has(d.id)));
      } else {
        setAvailable([]);
      }
    } catch (err) {
      console.error('Driver home load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, dismissedIds]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Poll for new available deliveries while idle (no active job) — this is
  // the "get notified of any order" behavior, via polling rather than push.
  useEffect(() => {
    if (activeDelivery) return; // don't bother polling the pool while busy
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeDelivery, load]);

  // Send periodic location pings while a delivery is actually in progress —
  // polling, not a live socket (see backend Delivery.currentLatitude
  // javadoc). Stops immediately once there's no active delivery.
  useEffect(() => {
    if (!activeDelivery) return;
    let cancelled = false;

    const ping = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const loc = await Location.getCurrentPositionAsync({});
      if (!cancelled) {
        updateDeliveryLocation(activeDelivery.id, loc.coords.latitude, loc.coords.longitude).catch(() => {});
      }
    };

    ping();
    const interval = setInterval(ping, LOCATION_PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeDelivery?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAccept = async (delivery: DeliveryStatus) => {
    if (!driverProfileRef.current) return;
    setAcceptingId(delivery.id);
    try {
      const accepted = await acceptDelivery(delivery.id, driverProfileRef.current.fullName, driverProfileRef.current.phoneNumber);
      setActiveDelivery(accepted);
      setAvailable([]);
    } catch (err: any) {
      Alert.alert('Could not accept', err?.message || 'Someone else may have already taken this delivery.');
      load(); // refresh the pool either way — this one's likely gone now
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = (deliveryId: string) => {
    setDismissedIds((prev) => new Set(prev).add(deliveryId));
    setAvailable((prev) => prev.filter((d) => d.id !== deliveryId));
  };

  const handleAdvanceStatus = async () => {
    if (!activeDelivery) return;
    const next = NEXT_STATUS[activeDelivery.status];
    if (!next) return;
    setAdvancingStatus(true);
    try {
      const updated = await updateDeliveryStatus(activeDelivery.id, next);
      setActiveDelivery(next === 'DELIVERED' ? null : updated);
      if (next === 'DELIVERED') {
        Alert.alert('Delivery complete', 'Nice work — you\'re free to accept another delivery now.');
        load();
      }
    } catch (err: any) {
      Alert.alert('Could not update status', err?.message || 'Please try again.');
    } finally {
      setAdvancingStatus(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await clearSession(); router.replace('/login'); } },
    ]);
  };

  const callCustomer = () => {
    if (activeDelivery?.phoneNumber) Linking.openURL(`tel:${activeDelivery.phoneNumber}`);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <LinearGradient
          colors={GlassTheme.gradients.headerBg}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowLight}>Driver Portal</Text>
              <Text style={styles.titleLight}>Hi, {user?.fullName?.split(' ')[0] ?? 'there'}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: activeDelivery ? '#FBBF24' : '#34D399' }]} />
            <Text style={styles.statusPillText}>
              {activeDelivery ? `On delivery · ${STATUS_LABEL[activeDelivery.status]}` : 'Online · waiting for deliveries'}
            </Text>
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : activeDelivery ? (
          <View style={styles.content}>
            <GlassCard style={styles.activeCard}>
              <View style={styles.activeHeaderRow}>
                <View style={styles.activeIconWrap}>
                  <Ionicons name="navigate-circle" size={22} color={GlassTheme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeTitle}>{STATUS_LABEL[activeDelivery.status]}</Text>
                  <Text style={styles.activeMeta}>Tracking {activeDelivery.trackingNumber}</Text>
                </View>
                <View style={styles.feeBadge}>
                  <Text style={styles.feeBadgeText}>₵{activeDelivery.estimatedFee.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color={GlassTheme.colors.primary} />
                <Text style={styles.activeAddress}>{activeDelivery.address}</Text>
              </View>
              {!!activeDelivery.instructions && (
                <Text style={styles.activeInstructions}>"{activeDelivery.instructions}"</Text>
              )}

              <TouchableOpacity onPress={callCustomer} style={styles.callRow}>
                <View style={styles.callIconWrap}>
                  <Ionicons name="call" size={15} color={GlassTheme.colors.success} />
                </View>
                <Text style={styles.callText}>{activeDelivery.phoneNumber}</Text>
              </TouchableOpacity>

              {NEXT_STATUS[activeDelivery.status] && (
                <GlassButton
                  label={`Mark as ${STATUS_LABEL[NEXT_STATUS[activeDelivery.status]!]}`}
                  onPress={handleAdvanceStatus}
                  loading={advancingStatus}
                  size="lg"
                />
              )}
            </GlassCard>
            <Text style={styles.hint}>You're on a delivery — new requests will show up here once you mark this one Delivered.</Text>
          </View>
        ) : (
          <FlatList
            data={available}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="bicycle-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>No deliveries waiting right now — this refreshes automatically.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <GlassCard style={styles.deliveryCard} variant="flat">
                <View style={styles.deliveryIconWrap}>
                  <Ionicons name="cube-outline" size={18} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryAddress}>{item.address}</Text>
                  <Text style={styles.deliveryMeta}>
                    {item.deliverySpeed} · ₵{item.estimatedFee.toFixed(2)}
                  </Text>
                  {!!item.instructions && <Text style={styles.deliveryInstructions}>"{item.instructions}"</Text>}
                </View>
                <View style={styles.deliveryActions}>
                  <TouchableOpacity onPress={() => handleReject(item.id)} style={styles.rejectBtn}>
                    <Ionicons name="close" size={18} color={GlassTheme.colors.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAccept(item)}
                    style={styles.acceptBtn}
                    disabled={acceptingId === item.id}
                  >
                    {acceptingId === item.id
                      ? <ActivityIndicator size="small" color="white" />
                      : <Ionicons name="checkmark" size={18} color="white" />}
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
  hero: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 14,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowLight: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  titleLight: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: GlassTheme.radius.pill },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  content: { padding: 20, gap: 12 },
  list: { padding: 16, gap: 12, paddingTop: 16 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },

  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  deliveryAddress: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  deliveryMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  deliveryInstructions: { fontSize: 12, color: GlassTheme.colors.textDim, marginTop: 4, fontStyle: 'italic' },
  deliveryActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GlassTheme.colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GlassTheme.colors.success, alignItems: 'center', justifyContent: 'center' },

  activeCard: { gap: 10 },
  activeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  activeTitle: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text },
  feeBadge: { backgroundColor: GlassTheme.colors.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: GlassTheme.radius.pill },
  feeBadgeText: { fontSize: 12, fontWeight: '800', color: GlassTheme.colors.success },
  divider: { height: 1, backgroundColor: GlassTheme.colors.divider, marginVertical: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  activeAddress: { flex: 1, fontSize: 14, color: GlassTheme.colors.text, fontWeight: '600' },
  activeInstructions: { fontSize: 13, color: GlassTheme.colors.textMuted, fontStyle: 'italic' },
  activeMeta: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 2 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  callIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: GlassTheme.colors.successLight, alignItems: 'center', justifyContent: 'center' },
  callText: { color: GlassTheme.colors.text, fontWeight: '600', fontSize: 13 },
  hint: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 4 },
});
