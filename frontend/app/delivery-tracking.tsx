import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, TextInput, Alert, ActivityIndicator, StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
import { DeliveryStatus, trackDelivery } from '@/services/deliveryService';
import { useAuth } from '@/context/AuthContext';
import { startDriverConversation } from '@/services/ChatClient';
import { getDriverRatingForDelivery, submitDriverRating, DriverRating } from '@/services/driverRatingService';

// New 2026-07-23 (task 40) — didn't exist before this: a patient who placed
// a delivery order had no way to actually watch it move, only the one-time
// tracking-number alert right after payment. This polls the same
// GET /api/delivery/track/{trackingNumber} endpoint the driver's location
// pings (POST /{id}/location) feed into — polling, not a live socket, same
// convention as everywhere else location-related in this app.
//
// Known honesty gap: there's no destination pin. Delivery.address is a
// plain text string (never geocoded — see delivery-service's calculateFee
// javadoc, no mapping API is integrated anywhere in this system), so the
// map can only show where the DRIVER currently is, not a point-to-point
// route to where they're headed. Showing a fake destination pin at a
// made-up coordinate would be worse than not showing one at all.
const POLL_INTERVAL_MS = 8000;
const ACCRA_FALLBACK = { latitude: 5.6037, longitude: -0.187 };

const STEPS: DeliveryStatus['status'][] = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const STEP_LABEL: Record<string, string> = {
  PENDING: 'Order placed', ASSIGNED: 'Driver assigned', PICKED_UP: 'Picked up',
  IN_TRANSIT: 'On the way', DELIVERED: 'Delivered',
};

export default function DeliveryTrackingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { trackingNumber } = useLocalSearchParams<{ trackingNumber: string }>();

  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rate-driver (roadmap: "Rate driver after delivery") — loaded once the
  // delivery is DELIVERED, mirrors pharmacy-details.tsx's review pattern.
  const [myDriverRating, setMyDriverRating] = useState<DriverRating | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const load = useCallback(async () => {
    if (!trackingNumber) return;
    try {
      const result = await trackDelivery(trackingNumber);
      setDelivery(result);
      setError(null);
    } catch {
      setError('Could not load this delivery — it may not exist, or you may not have access to it.');
    }
  }, [trackingNumber]);
  useEffect(() => { load(); }, [load]);


  useEffect(() => {
    if (!delivery || delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [delivery?.status, delivery, load]);

  const callDriver = () => {
    if (delivery?.driverPhone) Linking.openURL(`tel:${delivery.driverPhone}`);
  };

  const chatWithDriver = async () => {
    if (!user?.userId || !delivery?.driverId || startingChat) return;
    setStartingChat(true);
    try {
      const convo = await startDriverConversation(user.userId, delivery.driverId);
      router.push(`/chat/${convo.id}`);
    } catch (err: any) {
      Alert.alert('Could not start chat', err?.message || 'Something went wrong.');
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    if (delivery?.status !== 'DELIVERED' || !delivery?.id || ratingLoaded) return;
    (async () => {
      try {
        const existing = await getDriverRatingForDelivery(delivery.id);
        setMyDriverRating(existing);
      } finally {
        setRatingLoaded(true);
      }
    })();
  }, [delivery?.status, delivery?.id, ratingLoaded]);

  const submitRating = async () => {
    if (!delivery?.id || ratingDraft < 1) {
      Alert.alert('Add a rating', 'Tap a star to rate your driver before submitting.');
      return;
    }
    setSubmittingRating(true);
    try {
      const saved = await submitDriverRating(delivery.id, ratingDraft, commentDraft.trim());
      setMyDriverRating(saved);
    } catch (err: any) {
      Alert.alert('Could not submit rating', err?.message || 'Something went wrong.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const hasDriverLocation = delivery?.currentLatitude != null && delivery?.currentLongitude != null;
  const mapRegion = hasDriverLocation
    ? { latitude: delivery!.currentLatitude!, longitude: delivery!.currentLongitude!, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { ...ACCRA_FALLBACK, latitudeDelta: 0.08, longitudeDelta: 0.08 };

  const currentStepIndex = delivery ? STEPS.indexOf(delivery.status) : -1;

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <DarkHeader
        onBack={() => router.back()}
        title="Track Delivery"
        eyebrow={delivery ? 'TRACKING NUMBER' : undefined}
        heading={delivery?.trackingNumber}
      />
      <SheetBody>

        {error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.stateTitle}>Can&apos;t track this delivery</Text>
            <Text style={styles.stateHint}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.7}>
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !delivery ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior="padding"
          >
          {/* The "rate your driver" comment box sits at the very bottom of
              this scroll, so without this the keyboard covered the field
              being typed into. */}
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Live map ── */}
            <View style={styles.mapWrap}>
              <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                showsPointsOfInterest={false}
                toolbarEnabled={false}
              >
                {hasDriverLocation && (
                  <Marker
                    coordinate={{ latitude: delivery.currentLatitude!, longitude: delivery.currentLongitude! }}
                    title={delivery.driverName || 'Your driver'}
                    description={STEP_LABEL[delivery.status]}
                    pinColor={GlassTheme.colors.primary}
                  />
                )}
              </MapView>
              {!hasDriverLocation && (
                <View style={styles.mapOverlay}>
                  <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.mapOverlayText}>
                    {delivery.status === 'PENDING'
                      ? 'Waiting for a driver to accept your delivery…'
                      : 'Waiting for your driver to start sharing their location…'}
                  </Text>
                </View>
              )}
            </View>
            {/* ── Status timeline ── */}
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.card}>
              {STEPS.map((step, i) => {
                const done = i <= currentStepIndex;
                const isNow = i === currentStepIndex;
                const isLast = i === STEPS.length - 1;
                return (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, done && styles.stepDotDone]}>
                        {done && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                      </View>
                      {!isLast && <View style={[styles.stepLine, i < currentStepIndex && styles.stepLineDone]} />}
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{STEP_LABEL[step]}</Text>
                      {isNow && (
                        <View style={styles.nowChip}>
                          <Text style={styles.nowChipText}>Now</Text>
                        </View>
                      )}
                    </View>

                  </View>
                );
              })}
            </View>
            {/* ── Driver ── */}
            {!!delivery.driverName && (
              <>
                <Text style={styles.sectionTitle}>Your driver</Text>
                <View style={styles.card}>
                  <View style={styles.driverRow}>
                    <View style={styles.driverIcon}>
                      <Ionicons name="bicycle" size={20} color={GlassTheme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{delivery.driverName}</Text>
                      <Text style={styles.driverMeta}>Delivering your order</Text>
                    </View>
                    <TouchableOpacity onPress={chatWithDriver} style={styles.actionCircle} disabled={startingChat} activeOpacity={0.7}>
                      {startingChat
                        ? <ActivityIndicator size="small" color={GlassTheme.colors.primary} />
                        : <Ionicons name="chatbubble-ellipses-outline" size={18} color={GlassTheme.colors.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={callDriver} style={[styles.actionCircle, styles.actionCircleCall]} activeOpacity={0.7}>
                      <Ionicons name="call" size={18} color={GlassTheme.colors.success} />
                    </TouchableOpacity>
                  </View>

                </View>
              </>
            )}
            {/* ── Details ── */}
            <Text style={styles.sectionTitle}>Delivery details</Text>
            <View style={styles.card}>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tracking number</Text>
                <Text style={styles.infoValue}>{delivery.trackingNumber}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivering to</Text>
                <Text style={[styles.infoValue, styles.infoValueWrap]} numberOfLines={2}>{delivery.address}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivery fee</Text>
                <Text style={styles.infoValue}>₵{delivery.estimatedFee.toFixed(2)}</Text>
              </View>
            </View>

            {delivery.status === 'DELIVERED' && (
              <View style={styles.deliveredCard}>
                <Ionicons name="checkmark-circle" size={26} color={GlassTheme.colors.success} />
                <Text style={styles.deliveredText}>Delivered — enjoy!</Text>
              </View>
            )}
            {/* ── Rating ── */}

            {delivery.status === 'DELIVERED' && ratingLoaded && (
              <>
                <Text style={styles.sectionTitle}>{myDriverRating ? 'Your rating' : 'Rate your driver'}</Text>
                <View style={styles.card}>
                  {myDriverRating ? (
                    <>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= myDriverRating.rating ? 'star' : 'star-outline'}
                            size={24}
                            color={GlassTheme.colors.amber}
                          />
                        ))}
                      </View>
                      {!!myDriverRating.comment && (
                        <Text style={styles.reviewComment}>{myDriverRating.comment}</Text>
                      )}
                      <Text style={styles.infoLabel}>
                        You rated this delivery {myDriverRating.rating} star{myDriverRating.rating === 1 ? '' : 's'}.
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setRatingDraft(star)} hitSlop={6}>
                            <Ionicons
                              name={star <= ratingDraft ? 'star' : 'star-outline'}
                              size={30}
                              color={GlassTheme.colors.amber}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.reviewInput}
                        placeholder="Share your experience (optional)"
                        placeholderTextColor={GlassTheme.colors.textDim}
                        value={commentDraft}
                        onChangeText={setCommentDraft}
                        multiline
                        maxLength={1000}
                      />
                      <TouchableOpacity
                        style={[styles.submitBtn, submittingRating && { opacity: 0.6 }]}
                        onPress={submitRating}
                        disabled={submittingRating}
                        activeOpacity={0.85}
                      >
                        {submittingRating
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.submitBtnText}>Submit rating</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SheetBody>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
  mapWrap: {
    height: 220,
    borderRadius: GlassTheme.radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surfaceAlt,
  },

  mapOverlay: {
    position: 'absolute', left: 12, right: 12, bottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,28,46,0.88)',
    borderRadius: GlassTheme.radius.sm,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  mapOverlayText: { flex: 1, color: '#FFFFFF', fontSize: 12, lineHeight: 17 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 10,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14,
  },
  // ── Timeline ──
  stepRow: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 22 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: GlassTheme.colors.primary,
    borderColor: GlassTheme.colors.primary,
  },
  stepLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: GlassTheme.colors.divider },
  stepLineDone: { backgroundColor: GlassTheme.colors.primary },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 18 },
  stepLabel: { fontSize: 13, color: GlassTheme.colors.textDim, fontWeight: '600' },
  stepLabelDone: { color: GlassTheme.colors.text },
  nowChip: {
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  nowChipText: { fontSize: 9, fontWeight: '800', color: GlassTheme.colors.primary },
  // ── Driver ──
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },


  driverName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  driverMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  actionCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  actionCircleCall: { backgroundColor: GlassTheme.colors.successLight },
  // ── Info ──
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  infoLabel: { fontSize: 13, color: GlassTheme.colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  infoValueWrap: { flex: 1, textAlign: 'right' },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GlassTheme.colors.divider,
    marginVertical: 12,
  },
  deliveredCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GlassTheme.colors.successLight,
    borderRadius: GlassTheme.radius.md, padding: 14, marginTop: 16,
  },
  deliveredText: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.success },
  // ── Rating ──
  starRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  reviewComment: { fontSize: 13, color: GlassTheme.colors.text, lineHeight: 19, marginBottom: 8, textAlign: 'center' },



  reviewInput: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    padding: 12, fontSize: 13, color: GlassTheme.colors.text,
    minHeight: 70, textAlignVertical: 'top', marginBottom: 12,
  },
  submitBtn: {
    height: 46, borderRadius: GlassTheme.radius.sm,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  // ── States ──
  stateCard: {
    alignItems: 'center', gap: 6, paddingVertical: 44, paddingHorizontal: 28, margin: 20,
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
});