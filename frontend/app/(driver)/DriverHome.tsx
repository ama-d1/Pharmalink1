import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator, Alert, FlatList, Linking, RefreshControl,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { GlassTheme } from '@/constants/glassTheme';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
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
//
// Layout rebuilt onto the shared ink-header + white-sheet shell to match the
// rest of the app.
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
  }, [activeDelivery, activeDelivery?.id]);

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

  const nextStatus = activeDelivery ? NEXT_STATUS[activeDelivery.status] : undefined;

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        eyebrow="DRIVER PORTAL"
        heading={`Hi, ${user?.fullName?.split(' ')[0] ?? 'there'}`}
        rightIcon="log-out-outline"
        onRightPress={handleLogout}
      >
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: activeDelivery ? '#FBBF24' : '#34D399' }]} />
          <Text style={styles.statusPillText}>
            {activeDelivery ? `On delivery · ${STATUS_LABEL[activeDelivery.status]}` : 'Online · waiting for deliveries'}
          </Text>
        </View>
      </DarkHeader>

      <SheetBody>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} color={GlassTheme.colors.primary} />
        ) : activeDelivery ? (
          /* ── Active job ── */
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Current delivery</Text>

            <View style={styles.activeCard}>
              <View style={styles.activeHeaderRow}>
                <View style={styles.activeIcon}>
                  <Ionicons name="navigate-circle" size={21} color={GlassTheme.colors.primary} />
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
                <Ionicons name="location" size={15} color={GlassTheme.colors.primary} />
                <Text style={styles.activeAddress}>{activeDelivery.address}</Text>
              </View>
              {!!activeDelivery.instructions && (
                <Text style={styles.activeInstructions}>&quot;{activeDelivery.instructions}&quot;</Text>
              )}

              <TouchableOpacity onPress={callCustomer} style={styles.callRow} activeOpacity={0.7}>
                <View style={styles.callIcon}>
                  <Ionicons name="call" size={14} color={GlassTheme.colors.success} />
                </View>
                <Text style={styles.callText}>{activeDelivery.phoneNumber}</Text>
                <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textDim} />
              </TouchableOpacity>

              {nextStatus && (
                <TouchableOpacity
                  style={[styles.advanceBtn, advancingStatus && { opacity: 0.6 }]}
                  onPress={handleAdvanceStatus}
                  disabled={advancingStatus}
                  activeOpacity={0.85}
                >
                  {advancingStatus
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.advanceBtnText}>Mark as {STATUS_LABEL[nextStatus]}</Text>}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={17} color={GlassTheme.colors.textMuted} />
              <Text style={styles.noteText}>
                You&apos;re on a delivery — new requests will show up here once you mark this one Delivered.
              </Text>
            </View>
          </View>
        ) : (
          /* ── Available pool ── */
          <FlatList
            data={available}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>
                {available.length > 0
                  ? `${available.length} delivery request${available.length === 1 ? '' : 's'}`
                  : 'Delivery requests'}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.stateCard}>
                <Ionicons name="bicycle-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.stateTitle}>Nothing waiting</Text>
                <Text style={styles.stateHint}>
                  No deliveries right now — this refreshes automatically every few seconds.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <View style={styles.requestIcon}>
                  <Ionicons name="cube-outline" size={18} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestAddress} numberOfLines={2}>{item.address}</Text>
                  <View style={styles.requestMetaRow}>
                    <View style={styles.speedChip}>
                      <Text style={styles.speedChipText}>{item.deliverySpeed}</Text>
                    </View>
                    <Text style={styles.requestFee}>₵{item.estimatedFee.toFixed(2)}</Text>
                  </View>
                  {!!item.instructions && (
                    <Text style={styles.requestInstructions} numberOfLines={2}>&quot;{item.instructions}&quot;</Text>
                  )}
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleReject(item.id)} style={styles.rejectBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color={GlassTheme.colors.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAccept(item)}
                    style={styles.acceptBtn}
                    disabled={acceptingId === item.id}
                    activeOpacity={0.85}
                  >
                    {acceptingId === item.id
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </SheetBody>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 2 },

  // ── Header extras ──
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignSelf: 'flex-start',
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: GlassTheme.radius.pill,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 16, marginBottom: 10,
  },

  // ── Active delivery ──
  activeCard: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14,
  },
  activeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  activeTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  activeMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  feeBadge: {
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 11, paddingVertical: 5,
  },
  feeBadgeText: { fontSize: 13, fontWeight: '800', color: GlassTheme.colors.primary },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GlassTheme.colors.divider,
    marginVertical: 13,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  activeAddress: { flex: 1, fontSize: 13, color: GlassTheme.colors.text, lineHeight: 19 },
  activeInstructions: {
    fontSize: 12, color: GlassTheme.colors.textMuted,
    fontStyle: 'italic', marginTop: 8, lineHeight: 17,
  },
  callRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    paddingHorizontal: 12, paddingVertical: 11,
    marginTop: 13,
  },
  callIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GlassTheme.colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  callText: { flex: 1, fontSize: 13, fontWeight: '600', color: GlassTheme.colors.text },
  advanceBtn: {
    height: 50, borderRadius: GlassTheme.radius.md,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 14,
  },
  advanceBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // ── Requests ──
  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  requestIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  requestAddress: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text, lineHeight: 18 },
  requestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  speedChip: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  speedChipText: { fontSize: 10, fontWeight: '700', color: GlassTheme.colors.textMuted, textTransform: 'capitalize' },
  requestFee: { fontSize: 13, fontWeight: '800', color: GlassTheme.colors.text },
  requestInstructions: {
    fontSize: 11, color: GlassTheme.colors.textDim,
    fontStyle: 'italic', marginTop: 5,
  },
  requestActions: { gap: 8 },
  rejectBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GlassTheme.colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Shared ──
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, padding: 13, marginTop: 14,
  },
  noteText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  stateCard: {
    alignItems: 'center', gap: 6, paddingVertical: 44, paddingHorizontal: 28,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  stateTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 6 },
  stateHint: { fontSize: 12, color: GlassTheme.colors.textDim, textAlign: 'center', lineHeight: 18 },
});
