import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';
import { CartReviewModal } from '@/components/ui/CartReviewModal';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { LocationSuggestion, getCurrentLocation, reverseGeocode } from '@/services/locationService';
import { PharmacyPriceComparisonRow, searchAcrossPharmacies } from '@/services/pharmacyStockService';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';

// Quick-filter categories shown before a search is made — tapping one just
// pre-fills + runs the search box in the header rather than being a separate
// backend-driven taxonomy (drug-catalog-service has no category field to
// query by yet), so this is a curated shortlist of common search terms, not
// an exhaustive or authoritative category list.
const CATEGORIES: { label: string; query: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Daily\nEssentials', query: 'vitamin', icon: 'sunny-outline' },
  { label: 'Chronic\nCare', query: 'metformin', icon: 'pulse-outline' },
  { label: 'Cold & Flu\nRelief', query: 'paracetamol', icon: 'thermometer-outline' },
  { label: 'Allergy\nCare', query: 'cetirizine', icon: 'flower-outline' },
  { label: 'Pain &\nInflammation', query: 'ibuprofen', icon: 'bandage-outline' },
  { label: 'Skin &\nTopicals', query: 'hydrocortisone', icon: 'water-outline' },
];

// REBUILT 2026-07-23 — this used to be a flat, pharmacy-agnostic drug
// catalog browser (one global price per medication, no pharmacy attached).
// Now: search a medication, see every nearby pharmacy that stocks it with
// its own price (cheapest first), pick whichever works best, then order
// from that specific pharmacy — like a food delivery app, one order comes
// from one pharmacy. See pharmacy-service's PharmacyStock entity javadoc
// (backend) for the full feature context.
//
// Layout rebuilt to the ui_ref browse screen: dark ink header carrying the
// search field + cart button, then a white rounded sheet with the category
// grid and results.
export default function OrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cart,
    addToCart,
    replaceCartWithItem,
    updateQuantity,
    getCartTotal,
    getCartItemsCount,
    getCartPharmacy,
  } = useCart();
  const { showConfirm } = useModal();

  // Starts empty rather than the old hardcoded 'East Legon, Accra' — that was
  // a placeholder shown as if it were fact, so anyone who didn't notice it
  // could carry a stranger's address all the way to checkout.
  const [address, setAddress] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(true);
  // Set once the user picks an address by hand, so a slow reverse-geocode
  // that resolves afterwards can't overwrite their explicit choice.
  const addressPickedByUser = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PharmacyPriceComparisonRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showCartReview, setShowCartReview] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const total = getCartTotal();
  const cartItemsCount = getCartItemsCount();
  const cartPharmacy = getCartPharmacy();

  const handleSearch = async (queryOverride?: string) => {
    const query = (queryOverride ?? searchQuery).trim();
    if (query.length < 2) return;

    setIsSearching(true);
    setSearched(true);
    try {
      setResults(await searchAcrossPharmacies(query));
    } finally {
      setIsSearching(false);
    }
  };

  // Category tiles set the visible search box AND run the search with the
  // same value in one tap — setSearchQuery alone wouldn't be enough since
  // that state update isn't visible to handleSearch until the next render.
  const handleCategoryPress = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const resetSearch = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
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
      showConfirm({
        title: 'Switch pharmacy?',
        message: `Your cart has items from ${cartPharmacy?.pharmacyName}. Adding this item will clear your cart and start a new order from ${row.pharmacyName}.`,
        confirmLabel: 'Switch',
        destructive: true,
        onConfirm: () => replaceCartWithItem(drugLike, row.pharmacyId, row.pharmacyName),
      });
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

  // Resolve the device's actual location on arrival and reverse-geocode it
  // into a readable address, the same way the checkout screen (delivery.tsx)
  // already does. Failure is non-fatal: the row falls back to prompting for
  // an address, and "Change" is always available either way.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const coords = await getCurrentLocation();
        if (cancelled) return;
        const displayName = await reverseGeocode(coords.latitude, coords.longitude).catch(() => null);
        if (!cancelled && displayName && !addressPickedByUser.current) {
          setAddress(displayName);
        }
      } catch {
        // Permission denied or GPS unavailable — leave it unset so the UI
        // asks rather than inventing a location.
      } finally {
        if (!cancelled) setDetectingLocation(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChangeAddress = () => setShowLocationPicker(true);
  const handleLocationSelect = (location: LocationSuggestion) => {
    addressPickedByUser.current = true;
    setDetectingLocation(false);
    setAddress(location.address);
  };

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        onBack={() => router.back()}
        rightIcon="bag-outline"
        onRightPress={() => setShowCartReview(true)}
        rightBadge={cartItemsCount}
        search={{
          value: searchQuery,
          onChangeText: setSearchQuery,
          placeholder: 'Search medication',
          onSubmit: () => handleSearch(),
          onClear: resetSearch,
        }}
        onFilterPress={handleChangeAddress}
      />

      <SheetBody>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Delivery address — the filter button in the header opens the
              same picker, this row is the always-visible readout of it. */}
          <TouchableOpacity style={styles.addressRow} onPress={handleChangeAddress} activeOpacity={0.7}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={15} color={GlassTheme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Deliver to</Text>
              {detectingLocation && !address ? (
                <View style={styles.detectingRow}>
                  <ActivityIndicator size="small" color={GlassTheme.colors.primary} />
                  <Text style={styles.addressPlaceholder}>Finding your location…</Text>
                </View>
              ) : (
                <Text
                  style={address ? styles.addressValue : styles.addressPlaceholder}
                  numberOfLines={1}
                >
                  {address || 'Tap to set your address'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textDim} />
          </TouchableOpacity>

          {!!cartPharmacy && (
            <View style={styles.pharmacyBanner}>
              <Ionicons name="storefront-outline" size={15} color={GlassTheme.colors.primary} />
              <Text style={styles.pharmacyBannerText}>Ordering from {cartPharmacy.pharmacyName}</Text>
            </View>
          )}

          {/* ── Categories (pre-search state) ── */}
          {!isSearching && !searched && (
            <>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    style={styles.categoryTile}
                    onPress={() => handleCategoryPress(cat.query)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryIcon}>
                      <Ionicons name={cat.icon} size={22} color={GlassTheme.colors.primary} />
                    </View>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.hintCard}>
                <Ionicons name="search-outline" size={17} color={GlassTheme.colors.textMuted} />
                <Text style={styles.hintText}>
                  Pick a category or search a medication to compare prices across pharmacies near you.
                </Text>
              </View>
            </>
          )}

          {isSearching && <ActivityIndicator style={{ marginTop: 32 }} color={GlassTheme.colors.primary} />}

          {/* ── No results ── */}
          {!isSearching && searched && results.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="search" size={34} color={GlassTheme.colors.textDim} />
              <Text style={styles.emptyTitle}>No pharmacies stock this yet</Text>
              <Text style={styles.emptyHint}>Try a different medication name, or check back later.</Text>
              <TouchableOpacity style={styles.seeAllBtn} onPress={resetSearch} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Back to categories</Text>
                <Ionicons name="arrow-forward" size={14} color={GlassTheme.colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Results ── */}
          {!isSearching && results.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>
                  {results.length} option{results.length === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity onPress={resetSearch} hitSlop={8}>
                  <Text style={styles.sectionLink}>Clear</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSub}>Cheapest first</Text>

              {results.map((row) => {
                const quantity = cartQuantityFor(row);
                const selected = quantity > 0;
                return (
                  <View key={row.stockId} style={[styles.resultCard, selected && styles.resultCardSelected]}>
                    <TouchableOpacity
                      onPress={() => addRowToCart(row)}
                      activeOpacity={0.7}
                      style={styles.resultTop}
                    >
                      {row.imageBase64 ? (
                        <Image source={{ uri: row.imageBase64 }} style={styles.resultThumb} />
                      ) : (
                        <View style={styles.resultThumb}>
                          <Ionicons name="storefront" size={19} color={GlassTheme.colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{row.pharmacyName}</Text>
                        {!!row.pharmacyAddress && (
                          <Text style={styles.resultSub} numberOfLines={1}>{row.pharmacyAddress}</Text>
                        )}
                        <Text style={styles.resultStock}>
                          {row.quantity} in stock{row.rating ? ` · ${row.rating.toFixed(1)} rating` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Text style={styles.resultPrice}>₵{row.price.toFixed(2)}</Text>
                        {!selected && (
                          <View style={styles.addBtn}>
                            <Ionicons name="add" size={17} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {selected && (
                      <>
                        <View style={styles.resultDivider} />
                        <View style={styles.qtyRow}>
                          <TouchableOpacity onPress={() => updateQuantity(row.drugId, quantity - 1)} style={styles.qtyBtn}>
                            <Ionicons name="remove" size={15} color={GlassTheme.colors.text} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{quantity}</Text>
                          <TouchableOpacity onPress={() => updateQuantity(row.drugId, quantity + 1)} style={styles.qtyBtn}>
                            <Ionicons name="add" size={15} color={GlassTheme.colors.text} />
                          </TouchableOpacity>
                          <View style={{ flex: 1 }} />
                          <Text style={styles.qtySubtotal}>₵{(row.price * quantity).toFixed(2)}</Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* ── Pinned cart bar ── */}
        {cartItemsCount > 0 && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerLabel}>{cartItemsCount} item{cartItemsCount === 1 ? '' : 's'}</Text>
              <Text style={styles.footerTotal}>₵{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowCartReview(true)} activeOpacity={0.7}>
              <Text style={styles.reviewBtnText}>Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueBtn} onPress={handleProceedToPayment} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </SheetBody>

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
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 2 },

  addressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 12,
  },
  addressIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  addressLabel: { fontSize: 11, fontWeight: '600', color: GlassTheme.colors.textMuted },
  addressValue: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 2 },
  addressPlaceholder: { fontSize: 13, fontWeight: '500', color: GlassTheme.colors.textDim, marginTop: 2 },
  detectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },

  pharmacyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.sm, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 10,
  },
  pharmacyBannerText: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.primary },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 22, marginBottom: 12,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLink: { fontSize: 13, fontWeight: '600', color: GlassTheme.colors.accent, marginTop: 10 },
  sectionSub: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: -6, marginBottom: 12 },

  // ── Categories ──
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // FIXED — was `width: '31.5%'`, which doesn't account for the 10px gaps:
  // 3 × 31.5% (94.5%) plus 20px of gaps exceeds 100% of the container, so
  // only TWO tiles fit per row and every row left a wide gap on the right.
  // flexBasis under a third + flexGrow lets three tiles share each row and
  // expand into the leftover pixels, so the grid ends flush with the text
  // above it on any screen width.
  categoryTile: {
    flexBasis: '30%',
    flexGrow: 1,
    aspectRatio: 0.95,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    alignItems: 'center', justifyContent: 'center', gap: 9, padding: 8,
  },
  categoryIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11, fontWeight: '600', color: GlassTheme.colors.text,
    textAlign: 'center', lineHeight: 15,
  },

  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, padding: 13, marginTop: 14,
  },
  hintText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  // ── Results ──
  resultCard: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  resultCardSelected: { borderColor: GlassTheme.colors.primary },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultThumb: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  resultName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  resultSub: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  resultStock: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 3 },
  resultPrice: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  resultDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: GlassTheme.colors.divider,
    marginVertical: 12,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, minWidth: 20, textAlign: 'center' },
  qtySubtotal: { fontSize: 14, fontWeight: '800', color: GlassTheme.colors.text },

  // ── Empty ──
  emptyCard: {
    alignItems: 'center', gap: 6, paddingVertical: 34, paddingHorizontal: 24, marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  emptyTitle: { color: GlassTheme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 12, textAlign: 'center' },
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.sm, paddingVertical: 11, paddingHorizontal: 18,
    marginTop: 14,
  },
  seeAllText: { fontSize: 13, fontWeight: '600', color: GlassTheme.colors.text },

  // ── Footer cart bar ──
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surface,
  },
  footerLabel: { fontSize: 11, color: GlassTheme.colors.textMuted, fontWeight: '600' },
  footerTotal: { fontSize: 17, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 1 },
  reviewBtn: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: GlassTheme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surfaceAlt,
  },
  reviewBtnText: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  continueBtn: {
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: GlassTheme.radius.sm,
    backgroundColor: GlassTheme.colors.primary,
  },
  continueBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
