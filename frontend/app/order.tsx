import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useCart } from '@/context/CartContext';
import { CartReviewModal } from '@/components/ui/CartReviewModal';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { LocationSuggestion } from '@/services/locationService';
import { PharmacyPriceComparisonRow, searchAcrossPharmacies } from '@/services/pharmacyStockService';

// REBUILT 2026-07-23 — this used to be a flat, pharmacy-agnostic drug
// catalog browser (one global price per medication, no pharmacy attached).
// Now: search a medication, see every nearby pharmacy that stocks it with
// its own price (cheapest first), pick whichever works best, then order
// from that specific pharmacy — like a food delivery app, one order comes
// from one pharmacy. See pharmacy-service's PharmacyStock entity javadoc
// (backend) for the full feature context.
export default function OrderScreen() {
  const router = useRouter();
  const {
    cart,
    addToCart,
    replaceCartWithItem,
    updateQuantity,
    getCartTotal,
    getCartItemsCount,
    getCartPharmacy,
  } = useCart();

  const [address, setAddress] = useState('East Legon, Accra');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PharmacyPriceComparisonRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showCartReview, setShowCartReview] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const total = getCartTotal();
  const cartItemsCount = getCartItemsCount();
  const cartPharmacy = getCartPharmacy();

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (query.length < 2) return;

    setIsSearching(true);
    setSearched(true);
    try {
      setResults(await searchAcrossPharmacies(query));
    } finally {
      setIsSearching(false);
    }
  };

  const cartQuantityFor = (row: PharmacyPriceComparisonRow) => {
    const item = cart[row.drugId];
    return item && item.pharmacyId === row.pharmacyId ? item.quantity : 0;
  };

  const addRowToCart = (row: PharmacyPriceComparisonRow) => {
    const drugLike = {
      id: row.drugId,
      name: row.drugName,
      price: row.price,
      description: `From ${row.pharmacyName}`,
      inStock: row.quantity > 0,
    };

    const result = addToCart(drugLike, row.pharmacyId, row.pharmacyName);
    if (result === 'conflict') {
      Alert.alert(
        'Switch pharmacy?',
        `Your cart has items from ${cartPharmacy?.pharmacyName}. Adding this item will clear your cart and start a new order from ${row.pharmacyName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', style: 'destructive', onPress: () => replaceCartWithItem(drugLike, row.pharmacyId, row.pharmacyName) },
        ]
      );
    }
  };

  // Added 2026-07-23 — checkout now stops at a fulfillment-choice screen
  // (pickup vs. delivery) BEFORE payment, not a separate step the user is
  // prompted into after already paying. See delivery.tsx's rewritten
  // purpose.
  const handleProceedToPayment = () => {
    setShowCartReview(false);
    router.push({
      pathname: '/delivery',
      params: { address }
    });
  };

  const handleChangeAddress = () => setShowLocationPicker(true);
  const handleLocationSelect = (location: LocationSuggestion) => setAddress(location.address);

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Order Medication</Text>
          {cartItemsCount > 0 && (
            <TouchableOpacity
              onPress={() => setShowCartReview(true)}
              style={styles.cartBtn}
            >
              <Ionicons name="bag" size={20} color={GlassTheme.colors.text} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <GlassCard gradient glow style={styles.heroCard}>
            <Text style={styles.heroLabel}>Deliver to</Text>
            <Text style={styles.heroValue}>{address}</Text>
            <TouchableOpacity onPress={handleChangeAddress}>
              <Text style={styles.heroHint}>Tap to change delivery address</Text>
            </TouchableOpacity>
          </GlassCard>

          {cartPharmacy && (
            <GlassCard style={styles.pharmacyBanner}>
              <Ionicons name="storefront-outline" size={18} color={GlassTheme.colors.primary} />
              <Text style={styles.pharmacyBannerText}>Ordering from {cartPharmacy.pharmacyName}</Text>
            </GlassCard>
          )}

          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <GlassInput
                placeholder="Search for a medication..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                icon="search"
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setResults([]); setSearched(false); }}
                  style={styles.clearSearchBtn}
                >
                  <Ionicons name="close-circle" size={20} color={GlassTheme.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <GlassButton label="Compare Prices" onPress={handleSearch} size="sm" />
          </View>

          {isSearching && <ActivityIndicator style={{ marginTop: 20 }} color={GlassTheme.colors.primary} />}

          {!isSearching && searched && results.length === 0 && (
            <GlassCard style={styles.noResultsCard}>
              <Ionicons name="search" size={48} color={GlassTheme.colors.textMuted} />
              <Text style={styles.noResultsTitle}>No pharmacies stock this yet</Text>
              <Text style={styles.noResultsText}>
                Try a different medication name, or check back later.
              </Text>
            </GlassCard>
          )}

          {!isSearching && !searched && (
            <GlassCard style={styles.noResultsCard}>
              <Ionicons name="pricetags-outline" size={40} color={GlassTheme.colors.textMuted} />
              <Text style={styles.noResultsText}>
                Search a medication above to compare prices across pharmacies near you.
              </Text>
            </GlassCard>
          )}

          {!isSearching && results.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{results.length} pharmacy option{results.length === 1 ? '' : 's'} — cheapest first</Text>
              {results.map((row) => {
                const quantity = cartQuantityFor(row);
                const selected = quantity > 0;
                return (
                  <GlassCard key={row.stockId} style={[styles.drugCard, selected && styles.drugSelected]}>
                    <TouchableOpacity onPress={() => addRowToCart(row)} style={styles.drugContent}>
                      <View style={styles.drugRow}>
                        {row.imageBase64 ? (
                          <Image source={{ uri: row.imageBase64 }} style={styles.drugIcon} />
                        ) : (
                          <View style={[styles.drugIcon, selected && styles.drugIconSelected]}>
                            <Ionicons name="storefront" size={20} color={selected ? GlassTheme.colors.accent : GlassTheme.colors.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.drugName}>{row.pharmacyName}</Text>
                          {!!row.pharmacyAddress && <Text style={styles.drugDesc}>{row.pharmacyAddress}</Text>}
                          <Text style={styles.drugDosage}>{row.quantity} in stock{row.rating ? ` · ★ ${row.rating.toFixed(1)}` : ''}</Text>
                        </View>
                        <View style={styles.drugPriceSection}>
                          <Text style={styles.drugPrice}>₵{row.price.toFixed(2)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {selected && (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity onPress={() => updateQuantity(row.drugId, quantity - 1)} style={styles.quantityBtn}>
                          <Ionicons name="remove" size={16} color={GlassTheme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(row.drugId, quantity + 1)} style={styles.quantityBtn}>
                          <Ionicons name="add" size={16} color={GlassTheme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.subtotal}>₵{(row.price * quantity).toFixed(2)}</Text>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
            </>
          )}

          {cartItemsCount > 0 && (
            <View style={styles.cartActions}>
              <GlassCard style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal ({cartItemsCount} items)</Text>
                  <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
                </View>
                <Text style={styles.deliveryNote}>Pickup or delivery fee decided at the next step</Text>
              </GlassCard>

              <View style={styles.actionButtons}>
                <GlassButton
                  label="Review Cart"
                  onPress={() => setShowCartReview(true)}
                  size="lg"
                  variant="outline"
                  style={styles.reviewBtn}
                />
                <GlassButton
                  label={`Continue - ₵${total.toFixed(2)}`}
                  onPress={handleProceedToPayment}
                  size="lg"
                  style={styles.orderBtn}
                />
              </View>
            </View>
          )}
        </ScrollView>

        <CartReviewModal
          visible={showCartReview}
          onClose={() => setShowCartReview(false)}
          deliveryAddress={address}
        />

        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          currentLocation={address}
          title="Select Delivery Address"
        />
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
    justifyContent: 'space-between'
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    flex: 1,
    marginLeft: 12
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: GlassTheme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  heroCard: { marginBottom: 8 },
  heroLabel: { color: GlassTheme.colors.textMuted, fontSize: 12 },
  heroValue: { color: GlassTheme.colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  heroHint: { color: GlassTheme.colors.textDim, fontSize: 11, marginTop: 6 },

  pharmacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  pharmacyBannerText: { color: GlassTheme.colors.primary, fontWeight: '600', fontSize: 13 },

  searchSection: { marginBottom: 8, gap: 8 },
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    paddingRight: 50,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },

  sectionTitle: {
    color: GlassTheme.colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
  },

  noResultsCard: {
    alignItems: 'center',
    padding: 32,
  },
  noResultsTitle: {
    color: GlassTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },

  drugCard: { padding: 0 },
  drugSelected: { borderColor: GlassTheme.colors.accent },
  drugContent: { padding: 16 },
  drugRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  drugIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  drugIconSelected: {
    backgroundColor: GlassTheme.colors.accentLight,
  },
  drugName: {
    color: GlassTheme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  drugDesc: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  drugDosage: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  drugPriceSection: {
    alignItems: 'flex-end',
  },
  drugPrice: {
    color: GlassTheme.colors.accentSoft,
    fontWeight: '700',
    fontSize: 15
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.divider,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  subtotal: {
    color: GlassTheme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  totalCard: {
    marginTop: 8
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14
  },
  totalValue: {
    color: GlassTheme.colors.text,
    fontSize: 24,
    fontWeight: '700'
  },
  deliveryNote: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },

  cartActions: {
    marginTop: 16,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewBtn: {
    flex: 1,
  },
  orderBtn: {
    flex: 2,
  },
});
