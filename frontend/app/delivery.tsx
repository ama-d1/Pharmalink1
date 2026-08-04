import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useCart } from '@/context/CartContext';
import { LocationSuggestion, getCurrentLocation, reverseGeocode } from '@/services/locationService';
import { getPhoneNumberError } from '@/utils/validation';

type DeliverySpeed = 'standard' | 'express' | 'priority';
type FulfillmentType = 'PICKUP' | 'DELIVERY';
const FULFILLMENT_TABS = [
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'PICKUP', label: 'Pickup' },
] as const;

// REWRITTEN 2026-07-23 — this used to be a form the user only reached AFTER
// paying (an alert offering "Set Delivery Options" post-payment), and it
// only ever offered delivery — never pickup. You asked for the choice
// (pickup vs. delivery, "like food apps") to happen at checkout, BEFORE
// payment, with the delivery fee folded into one combined payment alongside
// the drugs. This screen is now that step: it sits between reviewing the
// cart and paying, decides the fulfillment type + fee, and hands both to
// payment.tsx via route params. No delivery-service call happens here
// anymore — that now happens automatically after a successful payment (see
// payment.tsx), not as a manual step the user has to remember to do.
//
// Layout rebuilt to the shared ink-header + white-sheet shell; the two big
// toggle cards became the standard segmented control so this screen picks up
// the same control vocabulary as the rest of the app.
export default function CheckoutFulfillmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { getCartTotal, getCartPharmacy } = useCart();

  const cartPharmacy = getCartPharmacy();
  const subtotal = getCartTotal();

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('DELIVERY');
  const [selectedSpeed, setSelectedSpeed] = useState<DeliverySpeed>('standard');
  const [deliveryAddress, setDeliveryAddress] = useState(address || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Added — auto-fill the delivery address from the device's actual GPS
  // location on arrival, instead of a hardcoded "East Legon, Accra" default
  // that had nothing to do with where the user actually was. Only runs when
  // no address was already passed in via route params and the user hasn't
  // already picked one (won't stomp a manual choice), and the "Change"
  // button (LocationPickerModal) remains fully available either way.
  useEffect(() => {
    if (address || fulfillmentType !== 'DELIVERY') return;
    let cancelled = false;
    (async () => {
      setDetectingLocation(true);
      try {
        const coords = await getCurrentLocation();
        if (cancelled) return;
        const displayName = await reverseGeocode(coords.latitude, coords.longitude).catch(() => null);
        if (!cancelled && displayName) {
          setDeliveryAddress((current) => current || displayName);
        }
      } catch {
        // Permission denied or GPS unavailable — the address field just
        // stays empty/whatever it already was; the user can still tap
        // "Change" to search or enter one manually.
      } finally {
        if (!cancelled) setDetectingLocation(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deliveryOptions = [
    { id: 'standard' as DeliverySpeed, name: 'Standard Delivery', time: '2-3 hours', price: 5.0, icon: 'bicycle' as const, description: 'Regular delivery within the city' },
    { id: 'express' as DeliverySpeed, name: 'Express Delivery', time: '45-60 minutes', price: 15.0, icon: 'car-sport' as const, description: 'Fast delivery for urgent needs' },
    { id: 'priority' as DeliverySpeed, name: 'Priority Delivery', time: '20-30 minutes', price: 25.0, icon: 'airplane' as const, description: 'Emergency delivery service' },
  ];

  const selectedOption = deliveryOptions.find((o) => o.id === selectedSpeed);
  const deliveryFee = fulfillmentType === 'DELIVERY' ? (selectedOption?.price ?? 0) : 0;
  const total = subtotal + deliveryFee;
  const isPickup = fulfillmentType === 'PICKUP';

  const handleContinue = () => {
    const phoneValidationError = getPhoneNumberError(phoneNumber);
    setPhoneError(phoneValidationError);
    if (phoneValidationError) return;

    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      Alert.alert('Missing address', 'Please enter your delivery address.');
      return;
    }

    const finalAddress = fulfillmentType === 'DELIVERY'
      ? deliveryAddress
      : `Pickup — ${cartPharmacy?.pharmacyName ?? 'pharmacy'}`;

    router.push({
      pathname: '/payment',
      params: {
        address: finalAddress,
        fulfillmentType,
        deliveryFee: String(deliveryFee),
        phoneNumber,
        instructions,
        deliverySpeed: selectedSpeed,
      },
    });
  };

  const handleLocationSelect = (location: LocationSuggestion) => setDeliveryAddress(location.address);

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <DarkHeader
        onBack={() => router.back()}
        title="Checkout"
        eyebrow="STEP 2 OF 3"
        heading="How do you want it?"
      />
      <SheetBody>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <View style={styles.tabsWrap}>
            <SegmentedTabs
              tabs={FULFILLMENT_TABS}
              value={fulfillmentType}
              onChange={setFulfillmentType}
            />
          </View>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ── Where ── */}
            <Text style={styles.sectionTitle}>{isPickup ? 'Pick up from' : 'Deliver to'}</Text>
            {isPickup ? (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="storefront" size={18} color={GlassTheme.colors.primary} />


                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{cartPharmacy?.pharmacyName ?? 'Your selected pharmacy'}</Text>
                    <Text style={styles.cardSub}>No delivery fee — collect it yourself when it&apos;s ready.</Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.card} onPress={() => setShowLocationPicker(true)} activeOpacity={0.7}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="location" size={18} color={GlassTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {detectingLocation && !deliveryAddress ? (
                      <View style={styles.detectingRow}>
                        <ActivityIndicator size="small" color={GlassTheme.colors.primary} />
                        <Text style={styles.cardSub}>Detecting your location…</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {deliveryAddress || 'No address set'}
                        </Text>
                        <Text style={styles.cardSub}>Tap to change</Text>
                      </>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />

                </View>
              </TouchableOpacity>
            )}
            {/* ── Contact ── */}
            <Text style={styles.sectionTitle}>Contact number</Text>
            <GlassInput
              placeholder={isPickup ? 'Phone for pickup-ready updates' : 'Phone number for delivery updates'}
              value={phoneNumber}
              onChangeText={(t) => { setPhoneNumber(t); if (phoneError) setPhoneError(''); }}
              keyboardType="phone-pad"
              icon="call-outline"
              error={phoneError}
            />
            {/* ── Speed ── */}
            {!isPickup && (

              <>
                <Text style={styles.sectionTitle}>Delivery speed</Text>
                {deliveryOptions.map((option) => {
                  const on = selectedSpeed === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setSelectedSpeed(option.id)}
                      style={[styles.speedCard, on && styles.speedCardActive]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.cardIcon, on && styles.cardIconActive]}>
                        <Ionicons name={option.icon} size={19} color={on ? '#FFFFFF' : GlassTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{option.name}</Text>
                        <Text style={styles.speedTime}>{option.time}</Text>
                        <Text style={styles.cardSub}>{option.description}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Text style={styles.speedPrice}>₵{option.price.toFixed(2)}</Text>
                        <View style={[styles.radio, on && styles.radioActive]}>
                          {on && <View style={styles.radioDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            {/* ── Notes ── */}
            <Text style={styles.sectionTitle}>
              {isPickup ? 'Note for the pharmacy' : 'Delivery instructions'}
              <Text style={styles.optional}>  optional</Text>
            </Text>
            <TextInput
              placeholder={isPickup ? "e.g. I'll come after 5pm" : 'e.g. Call when you reach the gate'}
              placeholderTextColor={GlassTheme.colors.textDim}
              value={instructions}
              onChangeText={setInstructions}
              style={styles.textArea}
              multiline
            />
            {/* ── Summary ── */}
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryBlock}>


              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>₵{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isPickup ? 'Pickup' : 'Delivery fee'}</Text>
                <Text style={styles.summaryValue}>₵{deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.dashedDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue to payment · ₵{total.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SheetBody>
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        currentLocation={deliveryAddress}
        title="Select Delivery Location"
      />
    </ScreenRoot>


  );
}

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 10,

  },
  optional: { fontSize: 12, fontWeight: '500', color: GlassTheme.colors.textDim },
  card: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: GlassTheme.colors.primary },
  cardTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  cardSub: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2, lineHeight: 17 },

  detectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  speedCardActive: { borderColor: GlassTheme.colors.primary },
  speedTime: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.primary, marginTop: 2 },
  speedPrice: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: GlassTheme.colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: GlassTheme.colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: GlassTheme.colors.primary },
  textArea: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    padding: 14, fontSize: 14,
    color: GlassTheme.colors.text,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    minHeight: 76, textAlignVertical: 'top',
  },
  summaryBlock: { gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: GlassTheme.colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },
  dashedDivider: {
    borderTopWidth: 1, borderStyle: 'dashed',
    borderColor: GlassTheme.colors.divider, marginVertical: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  totalValue: { fontSize: 17, fontWeight: '800', color: GlassTheme.colors.text },





  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surface,
  },
  continueBtn: {
    height: 54, borderRadius: GlassTheme.radius.md,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});