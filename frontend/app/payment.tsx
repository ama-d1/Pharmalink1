import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassTheme } from '@/constants/glassTheme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { createOrder } from '@/services/orderService';
import { initializePayment, verifyPayment } from '@/services/paymentService';
import { requestDelivery } from '@/services/deliveryService';
import { ScreenRoot, SheetBody } from '@/components/ui/ScreenShell';

// Same delivery-speed catalog delivery.tsx uses to let the user choose a
// speed — repeated here (not imported) because that screen only hands this
// one forward as a plain string param, not the full option object. Keeping
// the label/icon/time lookup local avoids threading three more params
// through the route just to redisplay what was already chosen.
const DELIVERY_SPEED_INFO: Record<string, { label: string; time: string; icon: keyof typeof Ionicons.glyphMap }> = {
  standard: { label: 'Standard Delivery (Rider)', time: '2-3 hours', icon: 'bicycle' },
  express: { label: 'Express Delivery (Rider)', time: '45-60 minutes', icon: 'car-sport' },
  priority: { label: 'Priority Delivery (Rider)', time: '20-30 minutes', icon: 'airplane' },
};

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
//
// Layout rebuilt to the ui_ref checkout screen: a white sheet over the dark
// ink backdrop, X-close + centred title, then Order summary / Delivery
// Details / Fees Breakdown sections and a pinned primary action.
export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // fulfillmentType/deliveryFee/phoneNumber/instructions/deliverySpeed all
  // come from the new checkout-fulfillment step (delivery.tsx) — see that
  // file's rewritten purpose. Defaults here are a safety net in case this
  // screen is ever reached without going through that step first, not the
  // normal path.
  const { address, fulfillmentType, deliveryFee: deliveryFeeParam, phoneNumber, instructions, deliverySpeed } =
    useLocalSearchParams<{ address: string; fulfillmentType?: string; deliveryFee?: string; phoneNumber?: string; instructions?: string; deliverySpeed?: string }>();
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useModal();
  const { getCartItems, getCartTotal, getCartPharmacy, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const isPickup = fulfillmentType === 'PICKUP';
  const cartItems = getCartItems();
  const cartPharmacy = getCartPharmacy();
  const subtotal = getCartTotal();
  const deliveryFee = isPickup ? 0 : Number(deliveryFeeParam || 0);
  const total = subtotal + deliveryFee;
  const speedInfo = deliverySpeed ? DELIVERY_SPEED_INFO[deliverySpeed] : undefined;

  const handlePayment = async () => {
    if (!user?.userId || !user?.email) {
      showError('Error', 'Please log in to complete payment');
      return;
    }
    if (cartItems.length === 0) {
      showError('Error', 'Cart is empty');
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
      showError('Payment Failed', error?.message || 'Could not start payment. Please try again.');
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
        showError('Payment Failed', 'Paystack reported this payment did not succeed. Please try again.');
        return;
      }

      clearCart();

      if (isPickup || !pendingOrderId) {
        showSuccess(
          'Payment Successful!',
          `Your payment of ₵${total.toFixed(2)} has been confirmed. Head to the pharmacy to pick up your order once it's ready.`,
          { confirmLabel: 'Done', onConfirm: () => router.replace('/(tabs)') }
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
        showSuccess(
          'Payment Successful!',
          `Your payment of ₵${total.toFixed(2)} has been confirmed and your delivery is on its way to being assigned. Tracking number: ${delivery.trackingNumber}.`,
          {
            confirmLabel: 'Track Delivery',
            onConfirm: () => router.replace({ pathname: '/delivery-tracking', params: { trackingNumber: delivery.trackingNumber } }),
          }
        );
      } catch (deliveryError: any) {
        // Was previously a hardcoded message that hid whatever actually
        // failed (deliveryService.ts's requestDelivery used to swallow the
        // real backend error too — fixed alongside this). Surfacing the
        // real reason here is what lets this actually get diagnosed and
        // fixed instead of guessed at.
        console.error('Auto delivery request failed:', deliveryError);
        showWarning(
          'Payment Successful — Delivery Request Failed',
          `Your payment of ₵${total.toFixed(2)} has been confirmed, but starting your delivery failed: "${deliveryError?.message || 'Unknown error'}". Please contact support with your order ID: ${pendingOrderId}.`,
          { confirmLabel: 'Done', onConfirm: () => router.replace('/(tabs)') }
        );
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      showError('Verification Failed', error?.message || 'Could not confirm your payment. Please contact support if you were charged.');
    } finally {
      setVerifying(false);
      setPendingOrderId(null);
    }
  };

  const busy = loading || verifying;

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Thin strip of the dark backdrop above the sheet — this is what makes
          the screen read as a checkout sheet presented over the app rather
          than just another full-bleed page. */}
      <View style={{ height: insets.top + 10 }} />

      <SheetBody style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={19} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Checkout</Text>
          <View style={styles.closeBtnPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Order summary ── */}
          <Text style={styles.sectionTitle}>Order summary</Text>
          <View style={styles.card}>
            {cartItems.map((item, i) => (
              <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowDivider]}>
                <View style={styles.itemThumb}>
                  <Ionicons name="medical" size={20} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  {!!item.dosage && <Text style={styles.itemSub}>{item.dosage}</Text>}
                  <Text style={styles.itemPrice}>₵{item.price.toFixed(2)}</Text>
                </View>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
            ))}
          </View>

          {/* ── Delivery details ── */}
          <Text style={styles.sectionTitle}>{isPickup ? 'Pickup Details' : 'Delivery Details'}</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View style={styles.detailThumb}>
                <Ionicons name="storefront" size={18} color={GlassTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{cartPharmacy?.pharmacyName ?? 'Your pharmacy'}</Text>
                <Text style={styles.detailSub} numberOfLines={2}>
                  {address || 'No address set'}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailBottomRow}>
              <View style={styles.detailChip}>
                <Ionicons
                  name={isPickup ? 'walk' : (speedInfo?.icon ?? 'bicycle')}
                  size={14}
                  color={GlassTheme.colors.textMuted}
                />
                <Text style={styles.detailChipText}>
                  {isPickup ? 'Self Pickup' : (speedInfo?.label ?? 'Delivery')}
                </Text>
              </View>
              <View style={styles.detailChip}>
                <Ionicons name="time-outline" size={14} color={GlassTheme.colors.textMuted} />
                <Text style={styles.detailChipText}>
                  {isPickup ? 'Ready soon' : (speedInfo?.time ?? 'A few hours')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Fees breakdown ──
              Only the two lines this app actually charges. The reference
              shows a third "Platform Service Fee" row; there is no such fee
              in this system, and inventing a line item on a real payment
              screen would misstate what the user is about to be charged. */}
          <Text style={styles.sectionTitle}>Fees Breakdown</Text>
          <View style={styles.feesBlock}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Subtotal</Text>
              <Text style={styles.feeValue}>₵{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{isPickup ? 'Pickup' : 'Delivery Fee'}</Text>
              <Text style={styles.feeValue}>₵{deliveryFee.toFixed(2)}</Text>
            </View>

            <View style={styles.dashedDivider} />

            <View style={styles.feeRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={13} color={GlassTheme.colors.textDim} />
            <Text style={styles.secureText}>
              Secured by Paystack — Mobile Money, card, or bank transfer.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity
            onPress={handlePayment}
            disabled={busy}
            activeOpacity={0.85}
            style={[styles.payBtn, busy && styles.payBtnDisabled]}
          >
            <Text style={styles.payBtnText}>
              {verifying ? 'Confirming payment…' : loading ? 'Starting checkout…' : 'Pay Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </SheetBody>

      <Modal visible={!!checkoutUrl} animationType="slide" onRequestClose={() => setCheckoutUrl(null)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={19} color={GlassTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Paystack Checkout</Text>
            <View style={styles.closeBtnPlaceholder} />
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
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPlaceholder: {
    width: 34,
    height: 34,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginTop: 18,
    marginBottom: 10,
  },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md,
    backgroundColor: GlassTheme.colors.surface,
    paddingHorizontal: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  itemRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GlassTheme.colors.divider,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  itemSub: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginTop: 6,
  },
  itemQty: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
    fontWeight: '600',
  },

  detailCard: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
    padding: 14,
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailThumb: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: GlassTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailName: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  detailSub: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GlassTheme.colors.divider,
    marginVertical: 12,
  },
  detailBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  detailChipText: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
    fontWeight: '600',
  },

  feesBlock: {
    gap: 12,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeLabel: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: GlassTheme.colors.divider,
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: GlassTheme.colors.text,
  },

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
  },
  secureText: {
    flex: 1,
    fontSize: 11,
    color: GlassTheme.colors.textDim,
    lineHeight: 16,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surface,
  },
  payBtn: {
    height: 54,
    borderRadius: GlassTheme.radius.md,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    opacity: 0.55,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlassTheme.colors.divider,
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
});
