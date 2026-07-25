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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { useCart } from '@/context/CartContext';
import { LocationSuggestion, getCurrentLocation, reverseGeocode } from '@/services/locationService';
import { getPhoneNumberError } from '@/utils/validation';

type DeliverySpeed = 'standard' | 'express' | 'priority';
type FulfillmentType = 'PICKUP' | 'DELIVERY';

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
export default function CheckoutFulfillmentScreen() {
  const router = useRouter();
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
    { id: 'standard' as DeliverySpeed, name: 'Standard Delivery', time: '2-3 hours', price: 5.0, icon: 'bicycle', description: 'Regular delivery within the city' },
    { id: 'express' as DeliverySpeed, name: 'Express Delivery', time: '45-60 minutes', price: 15.0, icon: 'car-sport', description: 'Fast delivery for urgent needs' },
    { id: 'priority' as DeliverySpeed, name: 'Priority Delivery', time: '20-30 minutes', price: 25.0, icon: 'airplane', description: 'Emergency delivery service' },
  ];

  const selectedOption = deliveryOptions.find((o) => o.id === selectedSpeed);
  const deliveryFee = fulfillmentType === 'DELIVERY' ? (selectedOption?.price ?? 0) : 0;
  const total = subtotal + deliveryFee;

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
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Pickup or Delivery?</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Fulfillment type toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleCard, fulfillmentType === 'DELIVERY' && styles.toggleCardSelected]}
                onPress={() => setFulfillmentType('DELIVERY')}
              >
                <Ionicons name="bicycle" size={26} color={fulfillmentType === 'DELIVERY' ? GlassTheme.colors.accent : GlassTheme.colors.textMuted} />
                <Text style={[styles.toggleLabel, fulfillmentType === 'DELIVERY' && styles.toggleLabelSelected]}>Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleCard, fulfillmentType === 'PICKUP' && styles.toggleCardSelected]}
                onPress={() => setFulfillmentType('PICKUP')}
              >
                <Ionicons name="storefront-outline" size={26} color={fulfillmentType === 'PICKUP' ? GlassTheme.colors.accent : GlassTheme.colors.textMuted} />
                <Text style={[styles.toggleLabel, fulfillmentType === 'PICKUP' && styles.toggleLabelSelected]}>Pickup</Text>
              </TouchableOpacity>
            </View>

            {fulfillmentType === 'PICKUP' ? (
              <GlassCard style={styles.addressCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="storefront" size={20} color={GlassTheme.colors.accent} />
                    <Text style={styles.cardTitle}>Pick up from</Text>
                  </View>
                </View>
                <Text style={styles.addressText}>{cartPharmacy?.pharmacyName ?? 'Your selected pharmacy'}</Text>
                <Text style={styles.pickupHint}>No delivery fee — collect it yourself when it's ready.</Text>
              </GlassCard>
            ) : (
              <GlassCard style={styles.addressCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="location" size={20} color={GlassTheme.colors.accent} />
                    <Text style={styles.cardTitle}>Delivery Address</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowLocationPicker(true)} style={styles.changeBtn}>
                    <Text style={styles.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
                {detectingLocation && !deliveryAddress ? (
                  <View style={styles.detectingRow}>
                    <ActivityIndicator size="small" color={GlassTheme.colors.accent} />
                    <Text style={styles.detectingText}>Detecting your location…</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText}>
                    {deliveryAddress || 'No address set — tap Change to pick one'}
                  </Text>
                )}
              </GlassCard>
            )}

            <GlassCard style={styles.contactCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Ionicons name="call" size={20} color={GlassTheme.colors.accent} />
                  <Text style={styles.cardTitle}>Contact Number</Text>
                </View>
              </View>
              <GlassInput
                placeholder={fulfillmentType === 'PICKUP' ? "Phone for pickup-ready updates" : "Phone number for delivery updates"}
                value={phoneNumber}
                onChangeText={(t) => { setPhoneNumber(t); if (phoneError) setPhoneError(''); }}
                keyboardType="phone-pad"
                icon="call"
                error={phoneError}
              />
            </GlassCard>

            {fulfillmentType === 'DELIVERY' && (
              <>
                <Text style={styles.sectionTitle}>Choose Delivery Speed</Text>
                {deliveryOptions.map((option) => (
                  <TouchableOpacity key={option.id} onPress={() => setSelectedSpeed(option.id)}>
                    <GlassCard style={styles.deliveryCard}>
                      <View style={styles.deliveryContent}>
                        <View style={styles.deliveryLeft}>
                          <View style={[styles.deliveryIcon, selectedSpeed === option.id && styles.deliveryIconSelected]}>
                            <Ionicons name={option.icon as any} size={24} color={selectedSpeed === option.id ? GlassTheme.colors.accent : GlassTheme.colors.primary} />
                          </View>
                          <View style={styles.deliveryInfo}>
                            <Text style={styles.deliveryName}>{option.name}</Text>
                            <Text style={styles.deliveryTime}>{option.time}</Text>
                            <Text style={styles.deliveryDesc}>{option.description}</Text>
                          </View>
                        </View>
                        <View style={styles.deliveryRight}>
                          <Text style={styles.deliveryPrice}>₵{option.price.toFixed(2)}</Text>
                          <View style={[styles.radioButton, selectedSpeed === option.id && styles.radioButtonSelected]}>
                            {selectedSpeed === option.id && <View style={styles.radioButtonInner} />}
                          </View>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <GlassCard style={styles.instructionsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Ionicons name="document-text" size={20} color={GlassTheme.colors.accent} />
                  <Text style={styles.cardTitle}>{fulfillmentType === 'PICKUP' ? 'Note for the pharmacy (optional)' : 'Special Instructions (optional)'}</Text>
                </View>
              </View>
              <GlassInput
                placeholder={fulfillmentType === 'PICKUP' ? 'e.g. I\'ll come after 5pm' : 'Any special delivery instructions'}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={3}
                style={styles.instructionsInput}
              />
            </GlassCard>

            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>₵{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery Fee'}</Text>
                <Text style={styles.summaryValue}>₵{deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <GlassButton
            label={`Continue to Payment - ₵${total.toFixed(2)}`}
            onPress={handleContinue}
            size="lg"
          />
        </View>

        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          currentLocation={deliveryAddress}
          title="Select Delivery Location"
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: GlassTheme.colors.text },
  content: { padding: 20, paddingBottom: 120 },

  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleCard: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 18,
    borderRadius: GlassTheme.radius.lg, backgroundColor: GlassTheme.colors.surface,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
  },
  toggleCardSelected: { borderColor: GlassTheme.colors.accent, backgroundColor: GlassTheme.colors.accentLight },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: GlassTheme.colors.textMuted },
  toggleLabelSelected: { color: GlassTheme.colors.accentSoft },

  addressCard: { marginBottom: 16 },
  contactCard: { marginBottom: 24 },
  instructionsCard: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: GlassTheme.colors.text },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: GlassTheme.colors.primaryLight, borderRadius: 12 },
  changeBtnText: { color: GlassTheme.colors.primary, fontSize: 12, fontWeight: '600' },
  addressText: { color: GlassTheme.colors.text, fontSize: 16, fontWeight: '500' },
  detectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detectingText: { color: GlassTheme.colors.textMuted, fontSize: 13 },
  pickupHint: { color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 6 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 16 },

  deliveryCard: { padding: 0, marginBottom: 12 },
  deliveryContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  deliveryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deliveryIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  deliveryIconSelected: { backgroundColor: GlassTheme.colors.accentLight },
  deliveryInfo: { flex: 1 },
  deliveryName: { fontSize: 16, fontWeight: '600', color: GlassTheme.colors.text, marginBottom: 2 },
  deliveryTime: { fontSize: 14, fontWeight: '500', color: GlassTheme.colors.accent, marginBottom: 2 },
  deliveryDesc: { fontSize: 12, color: GlassTheme.colors.textMuted },
  deliveryRight: { alignItems: 'flex-end', gap: 8 },
  deliveryPrice: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: GlassTheme.colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioButtonSelected: { borderColor: GlassTheme.colors.accent },
  radioButtonInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: GlassTheme.colors.accent },

  instructionsInput: { minHeight: 80, textAlignVertical: 'top' },

  summaryCard: { marginTop: 8 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: GlassTheme.colors.textMuted, fontSize: 14 },
  summaryValue: { color: GlassTheme.colors.text, fontSize: 14, fontWeight: '500' },
  totalRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: GlassTheme.colors.divider, marginTop: 4 },
  totalLabel: { color: GlassTheme.colors.text, fontSize: 18, fontWeight: '700' },
  totalValue: { color: GlassTheme.colors.accent, fontSize: 20, fontWeight: '700' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40,
    backgroundColor: GlassTheme.colors.surface, borderTopWidth: 1, borderTopColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
  },
});
