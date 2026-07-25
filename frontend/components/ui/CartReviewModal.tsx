import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { useCart } from '@/context/CartContext';
import { LocationSuggestion } from '@/services/locationService';

type Props = {
  visible: boolean;
  onClose: () => void;
  deliveryAddress: string;
};

export function CartReviewModal({ 
  visible, 
  onClose, 
  deliveryAddress
}: Props) {
  const {
    getCartItems,
    getCartTotal,
    getCartItemsCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartPharmacy,
  } = useCart();

  const cartPharmacy = getCartPharmacy();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(deliveryAddress);

  const cartItems = getCartItems();
  const total = getCartTotal();
  const itemsCount = getCartItemsCount();

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            clearCart();
            onClose();
          }
        }
      ]
    );
  };

  // Added 2026-07-23 — checkout now stops at a fulfillment-choice screen
  // (pickup vs. delivery, which decides the fee) before payment, so this
  // modal no longer assumes a flat delivery fee or routes straight to
  // /payment.
  const handleProceedToPayment = () => {
    onClose(); // Close modal first
    router.push({
      pathname: '/delivery',
      params: { address: currentAddress }
    });
  };

  const handleChangeAddress = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setCurrentAddress(location.address);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GlassBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Review Cart ({itemsCount} items)</Text>
            <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color={GlassTheme.colors.danger} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Delivery Address */}
            <GlassCard style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                <TouchableOpacity onPress={handleChangeAddress} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>{currentAddress}</Text>
            </GlassCard>

            {/* Pharmacy indicator — every item in the cart is guaranteed to
                be from this one pharmacy (see CartContext) */}
            {cartPharmacy && (
              <Text style={styles.pharmacyLabel}>Ordering from {cartPharmacy.pharmacyName}</Text>
            )}

            {/* Cart Items */}
            <Text style={styles.sectionTitle}>Your Medications</Text>
            {cartItems.map((item) => (
              <GlassCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                    {item.dosage && (
                      <Text style={styles.itemDosage}>Dosage: {item.dosage}</Text>
                    )}
                    {item.manufacturer && (
                      <Text style={styles.itemManufacturer}>By {item.manufacturer}</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeFromCart(item.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={20} color={GlassTheme.colors.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemFooter}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      style={styles.quantityBtn}
                    >
                      <Ionicons name="remove" size={16} color={GlassTheme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      style={styles.quantityBtn}
                    >
                      <Ionicons name="add" size={16} color={GlassTheme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.priceSection}>
                    <Text style={styles.unitPrice}>₵{item.price.toFixed(2)} each</Text>
                    <Text style={styles.totalPrice}>₵{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}

            {/* Order Summary */}
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({itemsCount} items)</Text>
                <Text style={styles.summaryValue}>₵{total.toFixed(2)}</Text>
              </View>
              <Text style={styles.deliveryNote}>Pickup or delivery fee decided at the next step</Text>
            </GlassCard>
          </ScrollView>

          <View style={styles.footer}>
            <GlassButton
              label={`Continue - ₵${total.toFixed(2)}`}
              onPress={handleProceedToPayment}
              size="lg"
            />
          </View>
        </SafeAreaView>

        {/* Location Picker Modal */}
        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          currentLocation={currentAddress}
          title="Change Delivery Address"
        />
      </GlassBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  
  addressCard: {
    marginBottom: 20,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: 12,
  },
  changeBtnText: {
    color: GlassTheme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  addressText: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  
  sectionTitle: {
    color: GlassTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  pharmacyLabel: {
    color: GlassTheme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDesc: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
  itemDosage: {
    color: GlassTheme.colors.textDim,
    fontSize: 12,
    marginBottom: 2,
  },
  itemManufacturer: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    fontStyle: 'italic',
  },
  removeBtn: {
    padding: 4,
  },
  
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    // FIXED — was 'rgba(255,255,255,0.1)', a leftover from the old
    // glassmorphic look (translucent white over a frosted/blurred
    // background). Against this screen's actual flat light background
    // that's ~invisible instead of a visible divider. GlassTheme.colors
    // .divider is the same solid gray every other current-style screen
    // uses for this exact purpose.
    borderTopColor: GlassTheme.colors.divider,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // FIXED — same leftover-glassmorphism issue: 'rgba(255,255,255,0.1)'
    // on a white card is essentially invisible, so these +/- buttons read
    // as plain unstyled icons with no tappable-looking surface.
    // primaryLight gives them a real, on-brand, visible background.
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  unitPrice: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
  },
  totalPrice: {
    color: GlassTheme.colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  
  summaryCard: {
    marginTop: 8,
  },
  summaryTitle: {
    color: GlassTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
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
    borderTopColor: GlassTheme.colors.divider, // FIXED — same invisible-divider issue as itemFooter above
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
  deliveryNote: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    // FIXED — 'rgba(255,255,255,0.95)' was a glassmorphic-era translucent
    // panel meant to sit over a blurred background. On today's flat
    // GlassBackground it just looks like a slightly-off-white smudge with
    // no real separation from the scroll content behind it. A solid
    // surface color + a real top border + a soft shadow (matching how
    // every other current-style screen's sticky footer/header separates
    // from scrollable content) reads as a proper anchored action bar.
    backgroundColor: GlassTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
  },
});