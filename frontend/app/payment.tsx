import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { createOrder } from '@/services/orderService';
import { initializePayment, verifyPayment } from '@/services/paymentService';
import { requestDelivery } from '@/services/deliveryService';

// FIXED 2026-07-23 — the backend's Paystack callback_url is built from
// PAYSTACK_CALLBACK_BASE_URL (payment-service's application.yaml), which
// defaults to http://localhost:8080 and was never overridden with something
// actually reachable from a phone — that host means "the phone's own
// localhost" to Paystack's hosted checkout page, so the WebView tried to
// load a dead address and showed a real connection-error page right after a
// successful payment. Matching (and blocking) purely on the URL's PATH
// here — not the full URL/host — sidesteps that entirely: it doesn't matter
// what unreachable host the backend put in the callback URL, because the
// WebView is never allowed to actually try loading it.
const CALLBACK_PATH_MARKER = '/api/payments/callback/';

// REWRITTEN 2026-07-23 — this used to be a form collecting fake MoMo/Card/
// Bank details that went nowhere real (orderService.processPayment() just
// flipped a status flag, no gateway ever saw any of it — see
// BACKEND_TODO.md's old "Payment" section). Now: create the order, ask the
// new payment-service to start a real Paystack transaction, open Paystack's
// own hosted checkout page in a WebView (it already lets the user pick
// Mobile Money/Card/Bank itself — no need to duplicate that choice here),
// then verify server-side once the WebView reports the checkout finished.
export default function PaymentScreen() {
  const router = useRouter();
  // fulfillmentType/deliveryFee/phoneNumber/instructions/deliverySpeed all
  // come from the new checkout-fulfillment step (delivery.tsx) — see that
  // file's rewritten purpose. Defaults here are a safety net in case this
  // screen is ever reached without going through that step first, not the
  // normal path.
  const { address, fulfillmentType, deliveryFee: deliveryFeeParam, phoneNumber, instructions, deliverySpeed } =
    useLocalSearchParams<{ address: string; fulfillmentType?: string; deliveryFee?: string; phoneNumber?: string; instructions?: string; deliverySpeed?: string }>();
  const { user } = useAuth();
  const { getCartItems, getCartTotal, getCartPharmacy, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const isPickup = fulfillmentType === 'PICKUP';
  const cartItems = getCartItems();
  const subtotal = getCartTotal();
  const deliveryFee = isPickup ? 0 : Number(deliveryFeeParam || 0);
  const total = subtotal + deliveryFee;

  const handlePayment = async () => {
    if (!user?.userId || !user?.email) {
      Alert.alert('Error', 'Please log in to complete payment');
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderItems = cartItems.map((item) => ({
        drugName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      // Added 2026-07-23: pharmacyId comes from the cart itself (every item
      // in it is guaranteed to be from the same pharmacy — see
      // CartContext's addToCart/replaceCartWithItem) rather than being
      // guessed or omitted, now that orders are pharmacy-specific.
      const pharmacyId = getCartPharmacy()?.pharmacyId;
      const order = await createOrder(
        user.userId, orderItems, address || 'Default Address', 'Paystack', pharmacyId,
        isPickup ? 'PICKUP' : 'DELIVERY', deliveryFee
      );

      const payment = await initializePayment(order.id, user.userId, user.email, total);

      if (!payment.authorizationUrl) {
        throw new Error('Paystack did not return a checkout URL');
      }

      setPendingOrderId(order.id);
      setPendingReference(payment.reference);
      setCheckoutUrl(payment.authorizationUrl);
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      Alert.alert('Payment Failed', error?.message || 'Could not start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Runs BEFORE the WebView attempts to load a URL — returning false here
  // stops that load from ever happening. This is what actually prevents the
  // dead-callback-URL error page from appearing (see the comment above
  // CALLBACK_PATH_MARKER): we never let the WebView try to fetch it at all,
  // we just recognize the path and handle it entirely in JS instead.
  const handleShouldStartLoad = (request: { url: string }): boolean => {
    if (verifying || !request.url.includes(CALLBACK_PATH_MARKER)) return true;

    const reference = request.url.split(CALLBACK_PATH_MARKER)[1]?.split(/[?#]/)[0];
    if (reference) {
      handlePaystackCallback(reference);
    }
    return false; // block the actual load
  };

  // REWRITTEN 2026-07-23 — the fulfillment choice (pickup vs. delivery) and
  // the fee are now decided BEFORE payment (see delivery.tsx), so this no
  // longer needs to prompt the user into a separate post-payment step.
  // For a delivery order, the actual delivery-service request now fires
  // automatically right here, using the details already collected on the
  // fulfillment screen — that's what "pay once, delivery is already in
  // motion" from your description actually requires; a manual follow-up
  // step the user could forget to complete wasn't it.
  const handlePaystackCallback = async (reference: string) => {
    setVerifying(true);
    setCheckoutUrl(null);

    try {
      const result = await verifyPayment(reference);
      if (result.status !== 'SUCCESS') {
        Alert.alert('Payment Failed', 'Paystack reported this payment did not succeed. Please try again.');
        return;
      }

      clearCart();

      if (isPickup || !pendingOrderId) {
        Alert.alert(
          'Payment Successful!',
          `Your payment of ₵${total.toFixed(2)} has been confirmed. Head to the pharmacy to pick up your order once it's ready.`,
          [{ text: 'Done', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      // Delivery order — request it now, automatically. A failure here
      // does NOT mean the payment failed (it already succeeded and is
      // recorded) — it just means the delivery leg needs a retry/manual
      // follow-up, so this is surfaced but doesn't block the success path.
      try {
        const delivery = await requestDelivery({
          orderId: pendingOrderId,
          deliverySpeed: (deliverySpeed as 'standard' | 'express' | 'priority') || 'standard',
          address: address || 'Default Address',
          phoneNumber: phoneNumber || '',
          instructions: instructions || undefined,
          estimatedFee: deliveryFee,
        });
        // Added 2026-07-23 (task 40) — routes straight into the new live
        // tracking screen instead of just going home, so "track it until it
        // arrives" is actually one tap away right when it matters most.
        Alert.alert(
          'Payment Successful!',
          `Your payment of ₵${total.toFixed(2)} has been confirmed and your delivery is on its way to being assigned. Tracking number: ${delivery.trackingNumber}.`,
          [{ text: 'Track Delivery', onPress: () => router.replace({ pathname: '/delivery-tracking', params: { trackingNumber: delivery.trackingNumber } }) }]
        );
      } catch (deliveryError: any) {
        // Was previously a hardcoded message that hid whatever actually
        // failed (deliveryService.ts's requestDelivery used to swallow the
        // real backend error too — fixed alongside this). Surfacing the
        // real reason here is what lets this actually get diagnosed and
        // fixed instead of guessed at.
        console.error('Auto delivery request failed:', deliveryError);
        Alert.alert(
          'Payment Successful — Delivery Request Failed',
          `Your payment of ₵${total.toFixed(2)} has been confirmed, but starting your delivery failed: "${deliveryError?.message || 'Unknown error'}". Please contact support with your order ID: ${pendingOrderId}.`,
          [{ text: 'Done', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      Alert.alert('Verification Failed', error?.message || 'Could not confirm your payment. Please contact support if you were charged.');
    } finally {
      setVerifying(false);
      setPendingOrderId(null);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cartItems.length})</Text>
              <Text style={styles.summaryValue}>₵{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{isPickup ? 'Pickup' : 'Delivery Fee'}</Text>
              <Text style={styles.summaryValue}>₵{deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.paystackCard}>
            <View style={styles.paystackHeader}>
              <Ionicons name="lock-closed" size={20} color={GlassTheme.colors.primary} />
              <Text style={styles.sectionTitle}>Secure Payment via Paystack</Text>
            </View>
            <Text style={styles.paystackDesc}>
              You&apos;ll be taken to Paystack&apos;s secure checkout, where you can pay by Mobile Money,
              card, or bank transfer. Your payment details never pass through this app.
            </Text>
          </GlassCard>
        </ScrollView>

        <View style={styles.footer}>
          <GlassButton
            label={verifying ? 'Confirming payment...' : `Pay ₵${total.toFixed(2)}`}
            onPress={handlePayment}
            loading={loading || verifying}
            size="lg"
          />
        </View>

        <Modal visible={!!checkoutUrl} animationType="slide" onRequestClose={() => setCheckoutUrl(null)}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.backBtn}>
                <Ionicons name="close" size={22} color={GlassTheme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Paystack Checkout</Text>
            </View>
            {/* Fallback for when Paystack's post-payment redirect doesn't get
                intercepted by handleShouldStartLoad for any reason (e.g. it
                loads via a mechanism that isn't a top-level navigation, or
                the WebView is slow to fire the event) — without this, a user
                whose payment actually succeeded could get stuck staring at
                Paystack's own success page with no way to proceed to
                tracking. Manually re-triggers the exact same verification
                path handleShouldStartLoad would have. */}
            {verifying ? (
              <View style={styles.verifyingBanner}>
                <Text style={styles.verifyingBannerText}>Confirming your payment…</Text>
              </View>
            ) : (
              pendingReference && (
                <TouchableOpacity
                  style={styles.manualVerifyBtn}
                  onPress={() => pendingReference && handlePaystackCallback(pendingReference)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={GlassTheme.colors.primary} />
                  <Text style={styles.manualVerifyText}>Already paid? Tap here to confirm</Text>
                </TouchableOpacity>
              )
            )}
            {checkoutUrl && (
              <WebView
                source={{ uri: checkoutUrl }}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                startInLoadingState
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  verifyingBanner: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  verifyingBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.primary,
  },
  manualVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  manualVerifyText: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: GlassTheme.colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  summaryCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: GlassTheme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.divider,
    marginTop: 4,
  },
  totalLabel: {
    color: GlassTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    color: GlassTheme.colors.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  paystackCard: {
    gap: 8,
  },
  paystackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paystackDesc: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: GlassTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
  },
});
