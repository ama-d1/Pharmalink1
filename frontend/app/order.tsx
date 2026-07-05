import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { CartReviewModal } from '@/components/ui/CartReviewModal';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { createOrder, getAvailableDrugs, processPayment, searchDrugs } from '@/services/orderService';
import { LocationSuggestion } from '@/services/locationService';

type Drug = { 
  id: string; 
  name: string; 
  description: string; 
  price: number; 
  category?: string;
  manufacturer?: string;
  inStock?: boolean;
  dosage?: string;
};

export default function OrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    getCartTotal, 
    getCartItemsCount,
    getCartItems
  } = useCart();
  
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [filteredDrugs, setFilteredDrugs] = useState<Drug[]>([]);
  const [address, setAddress] = useState('East Legon, Accra');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showCartReview, setShowCartReview] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const total = getCartTotal();
  const cartItemsCount = getCartItemsCount();

  useEffect(() => {
    loadDrugs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setFilteredDrugs(drugs);
      setIsSearching(false);
    }
  }, [searchQuery, drugs]);

  const loadDrugs = async () => {
    try {
      const drugsData = await getAvailableDrugs();
      setDrugs(drugsData);
      setFilteredDrugs(drugsData);
    } catch (error) {
      console.error('Error loading drugs:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const searchResults = await searchDrugs(query);
      setFilteredDrugs(searchResults);
    } catch (error) {
      // Fallback to local filtering if API search fails
      const filtered = drugs.filter(drug => 
        drug.name.toLowerCase().includes(query.toLowerCase()) ||
        drug.description.toLowerCase().includes(query.toLowerCase()) ||
        drug.category?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDrugs(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleDrug = (drug: Drug) => {
    if (cart[drug.id]) {
      removeFromCart(drug.id);
    } else {
      addToCart(drug);
    }
  };

  const handleOrder = async () => {
    if (!user?.userId) return Alert.alert('Error', 'Please log in first');
    const cartItems = getCartItems();
    if (cartItems.length === 0) return Alert.alert('Cart empty', 'Select at least one drug');

    const items = cartItems.map((item) => ({
      drugName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    }));

    setLoading(true);
    try {
      const order = await createOrder(user.userId, items, address, 'Mobile Money');
      await processPayment(order.id);
      Alert.alert('Success', 'Order placed & paid! Delivery on the way.', [
        { text: 'OK', onPress: () => {
          clearCart();
          router.back();
        }},
      ]);
    } catch {
      Alert.alert('Error', 'Could not complete order');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowCartReview(false);
    router.push({
      pathname: '/payment',
      params: { address }
    });
  };

  const handleChangeAddress = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setAddress(location.address);
  };

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
            <Text style={styles.heroHint}>Tap profile to change delivery address</Text>
          </GlassCard>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <GlassInput
                placeholder="Search for medications..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon="search"
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={GlassTheme.colors.textMuted} 
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Search Results (${filteredDrugs.length})` : 'Available Drugs'}
            </Text>
            {isSearching && (
              <Text style={styles.loadingText}>Searching...</Text>
            )}
          </View>

          {filteredDrugs.length === 0 && searchQuery ? (
            <GlassCard style={styles.noResultsCard}>
              <Ionicons name="search" size={48} color={GlassTheme.colors.textMuted} />
              <Text style={styles.noResultsTitle}>No medications found</Text>
              <Text style={styles.noResultsText}>
                Try searching with a different term or check your spelling
              </Text>
            </GlassCard>
          ) : (
            filteredDrugs.map((drug) => {
              const selected = !!cart[drug.id];
              const quantity = cart[drug.id]?.quantity || 0;
              return (
                <GlassCard
                  key={drug.id}
                  style={[styles.drugCard, selected && styles.drugSelected]}
                >
                  <TouchableOpacity 
                    onPress={() => (drug.inStock !== false) ? toggleDrug(drug) : null}
                    style={[styles.drugContent, (drug.inStock === false) && styles.drugContentDisabled]}
                    disabled={drug.inStock === false}
                  >
                    <View style={styles.drugRow}>
                      <View style={[
                        styles.drugIcon, 
                        selected && { backgroundColor: 'rgba(20,184,166,0.3)' },
                        (drug.inStock === false) && styles.drugIconDisabled
                      ]}>
                        <Ionicons 
                          name="medical" 
                          size={20} 
                          color={
                            (drug.inStock === false)
                              ? GlassTheme.colors.textMuted 
                              : selected 
                                ? GlassTheme.colors.accent 
                                : GlassTheme.colors.primary
                          } 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.drugHeader}>
                          <Text style={[
                            styles.drugName,
                            (drug.inStock === false) && styles.drugNameDisabled
                          ]}>
                            {drug.name}
                          </Text>
                          {(drug.inStock === false) && (
                            <Text style={styles.outOfStockBadge}>Out of Stock</Text>
                          )}
                        </View>
                        <Text style={styles.drugDesc}>{drug.description}</Text>
                        {drug.dosage && (
                          <Text style={styles.drugDosage}>Dosage: {drug.dosage}</Text>
                        )}
                        {drug.manufacturer && (
                          <Text style={styles.drugManufacturer}>
                            By {drug.manufacturer}
                          </Text>
                        )}
                      </View>
                      <View style={styles.drugPriceSection}>
                        <Text style={[
                          styles.drugPrice,
                          (drug.inStock === false) && styles.drugPriceDisabled
                        ]}>
                          ₵{drug.price.toFixed(2)}
                        </Text>
                        {drug.category && (
                          <Text style={styles.drugCategory}>{drug.category}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {selected && (drug.inStock !== false) && (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(drug.id, quantity - 1)}
                        style={styles.quantityBtn}
                      >
                        <Ionicons name="remove" size={16} color={GlassTheme.colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(drug.id, quantity + 1)}
                        style={styles.quantityBtn}
                      >
                        <Ionicons name="add" size={16} color={GlassTheme.colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.subtotal}>
                        ₵{(drug.price * quantity).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </GlassCard>
              );
            })
          )}

          {cartItemsCount > 0 && (
            <View style={styles.cartActions}>
              <GlassCard style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total ({cartItemsCount} items)</Text>
                  <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
                </View>
              </GlassCard>

              <View style={styles.actionButtons}>
                <GlassButton
                  label="Review Cart"
                  onPress={() => setShowCartReview(true)}
                  size="lg"
                  style={styles.reviewBtn}
                />
                <GlassButton 
                  label={`Quick Order - ₵${total.toFixed(2)}`}
                  onPress={handleProceedToPayment} 
                  loading={loading} 
                  size="lg"
                  style={styles.orderBtn}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Cart Review Modal */}
        <CartReviewModal
          visible={showCartReview}
          onClose={() => setShowCartReview(false)}
          deliveryAddress={address}
        />

        {/* Location Picker Modal */}
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
  
  searchSection: { marginBottom: 8 },
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
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { 
    color: GlassTheme.colors.text, 
    fontWeight: '700', 
    fontSize: 15 
  },
  loadingText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
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
  drugContentDisabled: { 
    opacity: 0.6,
  },
  drugRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  drugIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  drugIconDisabled: {
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  drugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  drugName: { 
    color: GlassTheme.colors.text, 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  drugNameDisabled: {
    color: GlassTheme.colors.textMuted,
  },
  outOfStockBadge: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  drugDesc: { 
    color: GlassTheme.colors.textMuted, 
    fontSize: 12, 
    marginBottom: 2 
  },
  drugDosage: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    marginBottom: 2,
  },
  drugManufacturer: {
    color: GlassTheme.colors.textDim,
    fontSize: 10,
    fontStyle: 'italic',
  },
  drugPriceSection: {
    alignItems: 'flex-end',
  },
  drugPrice: { 
    color: GlassTheme.colors.accentSoft, 
    fontWeight: '700', 
    fontSize: 15 
  },
  drugPriceDisabled: {
    color: GlassTheme.colors.textMuted,
  },
  drugCategory: {
    color: GlassTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orderBtn: {
    flex: 2,
  },
});
