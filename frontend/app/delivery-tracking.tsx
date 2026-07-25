import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!delivery || delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [delivery?.status, load]);

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
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Track Delivery</Text>
        </View>

        {error ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : !delivery ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.mapWrap}>
              <MapView style={styles.map} provider={PROVIDER_GOOGLE} region={mapRegion}>
                {hasDriverLocation && (
                  <Marker
                    coordinate={{ latitude: delivery.currentLatitude!, longitude: delivery.currentLongitude! }}
                    title={delivery.driverName || 'Your driver'}
                    description={STEP_LABEL[delivery.status]}
                    pinColor={GlassTheme.colors.accent}
                  />
                )}
              </MapView>
              {!hasDriverLocation && (
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapOverlayText}>
                    {delivery.status === 'PENDING' ? 'Waiting for a driver to accept your delivery…' : 'Waiting for your driver to start sharing their location…'}
                  </Text>
                </View>
              )}
            </View>

            {/* Status stepper */}
            <GlassCard style={styles.stepperCard}>
              {STEPS.map((step, i) => (
                <View key={step} style={styles.stepRow}>
                  <View style={[styles.stepDot, i <= currentStepIndex && styles.stepDotDone]}>
                    {i <= currentStepIndex && <Ionicons name="checkmark" size={12} color="white" />}
                  </View>
                  <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelDone]}>{STEP_LABEL[step]}</Text>
                  {i === currentStepIndex && <Text style={styles.stepNow}>Now</Text>}
                </View>
              ))}
            </GlassCard>

            {delivery.driverName && (
              <GlassCard style={styles.driverCard}>
                <View style={styles.driverIcon}>
                  <Ionicons name="bicycle" size={22} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{delivery.driverName}</Text>
                  <Text style={styles.driverMeta}>Your driver</Text>
                </View>
                <TouchableOpacity onPress={chatWithDriver} style={styles.chatBtn} disabled={startingChat}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={GlassTheme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={callDriver} style={styles.callBtn}>
                  <Ionicons name="call" size={20} color={GlassTheme.colors.success} />
                </TouchableOpacity>
              </GlassCard>
            )}

            <GlassCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tracking Number</Text>
                <Text style={styles.infoValue}>{delivery.trackingNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivering to</Text>
                <Text style={styles.infoValue}>{delivery.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivery Fee</Text>
                <Text style={styles.infoValue}>₵{delivery.estimatedFee.toFixed(2)}</Text>
              </View>
            </GlassCard>

            {delivery.status === 'DELIVERED' && (
              <GlassCard style={styles.deliveredCard}>
                <Ionicons name="checkmark-circle" size={28} color={GlassTheme.colors.success} />
                <Text style={styles.deliveredText}>Delivered! Enjoy.</Text>
              </GlassCard>
            )}

            {delivery.status === 'DELIVERED' && ratingLoaded && (
              <GlassCard style={styles.writeReviewCard}>
                {myDriverRating ? (
                  <>
                    <Text style={styles.infoTitle}>Your rating</Text>
                    <View style={styles.starPickerRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= myDriverRating.rating ? 'star' : 'star-outline'}
                          size={26}
                          color={GlassTheme.colors.amber}
                        />
                      ))}
                    </View>
                    {!!myDriverRating.comment && (
                      <Text style={styles.reviewComment}>{myDriverRating.comment}</Text>
                    )}
                    <Text style={styles.infoLabel}>You rated this delivery {myDriverRating.rating} star{myDriverRating.rating === 1 ? '' : 's'}.</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.infoTitle}>Rate your driver</Text>
                    <View style={styles.starPickerRow}>
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
                    <GlassButton
                      label="Submit Rating"
                      onPress={submitRating}
                      loading={submittingRating}
                    />
                  </>
                )}
              </GlassCard>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: GlassTheme.colors.text },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 80, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },

  mapWrap: { height: 240, borderRadius: GlassTheme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: GlassTheme.colors.glassBorder },
  map: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  mapOverlayText: { color: 'white', fontSize: 12, textAlign: 'center' },

  stepperCard: { gap: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: GlassTheme.colors.surfaceAlt, borderWidth: 1.5, borderColor: GlassTheme.colors.divider, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: GlassTheme.colors.success, borderColor: GlassTheme.colors.success },
  stepLabel: { fontSize: 13, color: GlassTheme.colors.textMuted, flex: 1 },
  stepLabelDone: { color: GlassTheme.colors.text, fontWeight: '600' },
  stepNow: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.accent },

  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  driverMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.successLight, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  infoCard: { gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontSize: 12, color: GlassTheme.colors.textMuted },
  infoValue: { fontSize: 12, color: GlassTheme.colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  deliveredCard: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  deliveredText: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.success },

  infoTitle: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  writeReviewCard: { gap: 12 },
  starPickerRow: { flexDirection: 'row', gap: 8 },
  reviewInput: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    color: GlassTheme.colors.text,
    textAlignVertical: 'top',
  },
  reviewComment: { fontSize: 14, color: GlassTheme.colors.textMuted, lineHeight: 20 },
});
