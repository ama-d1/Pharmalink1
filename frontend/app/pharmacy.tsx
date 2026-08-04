import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { PharmacyMap3D, PharmacyMapHandle } from '@/components/3d/PharmacyMap3D';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import {
  getPharmacies,
  searchPharmacies,
  getNearbyPharmacies,
  Pharmacy,
  PharmacySearchParams,
} from '@/services/pharmacyService';
import { LocationSuggestion, reverseGeocode } from '@/services/locationService';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';

const AVAILABLE_SERVICES = [
  'Prescription',
  'OTC Medications',
  'Health Consultation',
  'Vaccination',
  'Blood Pressure Check',
  'Health Screening',
  'Medical Devices',
  'Traditional Medicine',
  'Student Health',
];

// Splits a one-line address into the two-line label the top card shows
// ("Kwame Nkrumah University" over "Oferikrom"), matching how map apps
// present the active location.
function splitAddress(address: string): { title: string; subtitle: string } {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    title: parts[0] || address,
    subtitle: parts.slice(1, 3).join(', '),
  };
}

// REBUILT as a map-first screen: the map is the page, and everything else
// floats over it (location card, locate button, search bar, results sheet).
// The previous version buried a 260px map halfway down a long scroll of
// filters and list cards, so the primary job of the screen — see what's
// around me — required scrolling past everything else first.
//
// All data/filter behaviour is unchanged; the filters and the full list now
// live in bottom sheets instead of inline panels.
export default function PharmacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The search bar sits in an absolutely-positioned stack pinned to the
  // bottom, so on iOS the keyboard would cover the very field being typed
  // into. See the hook for why this is 0 on Android.
  const keyboardOffset = useKeyboardOffset();
  const mapRef = useRef<PharmacyMapHandle>(null);

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Accra, Ghana');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filter states
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  const loadPharmacies = useCallback(async () => {
    const data = await getPharmacies();
    setPharmacies(data);
    setFilteredPharmacies(data);
  }, []);

  const loadPharmaciesNearMe = useCallback(async (recenter = false) => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // No permission — fall back to the general list
        await loadPharmacies();
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });
      if (recenter) mapRef.current?.focus({ latitude, longitude });

      // Best-effort: label the top card with where the user actually is
      // instead of the hardcoded "Accra, Ghana" default.
      reverseGeocode(latitude, longitude)
        .then((name) => { if (name) setCurrentLocation(name); })
        .catch(() => {});

      const nearby = await getNearbyPharmacies(latitude, longitude, 10);
      if (nearby.length > 0) {
        setPharmacies(nearby);
        setFilteredPharmacies(nearby);
      } else {
        // No pharmacies nearby — fall back to the general list
        await loadPharmacies();
      }
    } catch (error) {
      console.error('Error loading nearby pharmacies:', error);
      await loadPharmacies();
    } finally {
      setLoading(false);
    }
  }, [loadPharmacies]);

  // FIXED (kept from the previous version): this used to be followed by a
  // second useEffect that independently re-requested location permission and
  // called getCurrentPositionAsync again — loadPharmaciesNearMe already does
  // both, so the second effect was duplicate work that could pop the
  // permission dialog twice on some Android versions.
  useEffect(() => { loadPharmaciesNearMe(); }, [loadPharmaciesNearMe]);

  const handleSearch = useCallback(async () => {
    // Only skip the network round-trip when literally nothing is filtered —
    // any active filter (including a non-default sort or "open now") needs to
    // actually reach the backend, not just a text query or service selection.
    const hasActiveFilters =
      searchQuery.trim() || selectedServices.length > 0 || minRating > 0 || openNow || sortBy !== 'distance';
    if (!hasActiveFilters) {
      setFilteredPharmacies(pharmacies);
      return;
    }

    setLoading(true);
    try {
      const searchParams: PharmacySearchParams = {
        query: searchQuery,
        userLocation: userLocation ?? undefined,
        filters: {
          location: currentLocation,
          services: selectedServices.length > 0 ? selectedServices : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          openNow,
          sortBy,
        },
      };
      setFilteredPharmacies(await searchPharmacies(searchParams));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedServices, minRating, openNow, sortBy, pharmacies, userLocation, currentLocation]);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim()) handleSearch();
      else setFilteredPharmacies(pharmacies);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, pharmacies]);

  const handleLocationSelect = (location: LocationSuggestion) => {
    setCurrentLocation(location.address);
    if (searchQuery.trim() || selectedServices.length > 0) handleSearch();
  };

  const handleRecenter = () => {
    if (userLocation) {
      mapRef.current?.focus(userLocation);
      return;
    }
    loadPharmaciesNearMe(true);
  };

  const handlePharmacyPress = (pharmacy: Pharmacy) => {
    setSelectedId(pharmacy.id);
    setShowResults(false);
    // Pins sourced from OpenStreetMap (task 63) aren't PharmaLink pharmacies
    // — no stock, no pharmacist account, nothing for pharmacy-details to
    // load. Route those to a simple directions/call sheet instead of a
    // details page that would just 404.
    if (pharmacy.isRegistered === false) {
      showUnregisteredPharmacyOptions(pharmacy);
      return;
    }
    router.push({ pathname: '/pharmacy-details', params: { id: pharmacy.id } });
  };

  const showUnregisteredPharmacyOptions = (pharmacy: Pharmacy) => {
    const buttons: any[] = [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Get Directions',
        onPress: () => Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`
        ),
      },
    ];
    if (pharmacy.phone) {
      buttons.push({ text: 'Call', onPress: () => Linking.openURL(`tel:${pharmacy.phone}`) });
    }
    // Kept as a native Alert rather than the app's AppModal because this is a
    // genuine three-action choice; AppModal only renders confirm/cancel.
    Alert.alert(
      pharmacy.name,
      `${pharmacy.address}\n\nThis pharmacy isn't on PharmaLink yet, so ordering through the app isn't available here — but you can get directions or call ahead.`,
      buttons
    );
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const clearFilters = () => {
    setSelectedServices([]);
    setMinRating(0);
    setOpenNow(false);
    setSortBy('distance');
    setSearchQuery('');
  };

  const mapPins = useMemo(
    () =>
      filteredPharmacies
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          isOpen: p.isOpen,
          isRegistered: p.isRegistered,
        })),
    [filteredPharmacies]
  );

  const selected = filteredPharmacies.find((p) => p.id === selectedId);
  const activeFilterCount =
    selectedServices.length + (minRating > 0 ? 1 : 0) + (openNow ? 1 : 0);
  const label = splitAddress(currentLocation);

  // Tapping a pin recentres on it so the selected card never covers it.
  const handleSelectPin = (id: string) => {
    setSelectedId(id);
    const p = filteredPharmacies.find((x) => x.id === id);
    if (p?.latitude != null && p?.longitude != null) {
      mapRef.current?.focus({ latitude: p.latitude, longitude: p.longitude });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <PharmacyMap3D
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        pharmacies={mapPins}
        selectedId={selectedId}
        onSelect={handleSelectPin}
        userLocation={userLocation}
        showsMyLocationButton={false}
      />

      {/* ── Floating top controls ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={GlassTheme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => setShowLocationPicker(true)}
          activeOpacity={0.8}
        >
          <View style={styles.locationIcon}>
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle} numberOfLines={1}>{label.title}</Text>
            {!!label.subtitle && (
              <Text style={styles.locationSubtitle} numberOfLines={1}>{label.subtitle}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.circleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={GlassTheme.colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={[styles.loadingPill, { top: insets.top + 78 }]}>
          <ActivityIndicator size="small" color={GlassTheme.colors.primary} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      )}

      {/* ── Floating bottom stack ── */}
      <View
        style={[
          styles.bottomStack,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 + keyboardOffset },
        ]}
      >
        <TouchableOpacity style={styles.fab} onPress={handleRecenter} activeOpacity={0.85}>
          <Ionicons name="navigate" size={20} color={GlassTheme.colors.primary} />
        </TouchableOpacity>

        {/* Selected pharmacy preview — appears when a pin is tapped */}
        {selected && (
          <View style={styles.selectedCard}>
            <TouchableOpacity
              style={styles.selectedRow}
              onPress={() => handlePharmacyPress(selected)}
              activeOpacity={0.75}
            >
              <View style={styles.selectedIcon}>
                <Ionicons name="medical" size={19} color={GlassTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.selectedTitleRow}>
                  <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
                  {selected.verified && (
                    <Ionicons name="checkmark-circle" size={14} color={GlassTheme.colors.success} />
                  )}
                </View>
                <Text style={styles.selectedAddr} numberOfLines={1}>{selected.address}</Text>
                <View style={styles.selectedMeta}>
                  {selected.isRegistered === false ? (
                    <Text style={styles.notOnApp}>Not on PharmaLink</Text>
                  ) : (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={11} color={GlassTheme.colors.amber} />
                      <Text style={styles.metaText}>{selected.rating}</Text>
                    </View>
                  )}
                  {selected.distance != null && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={11} color={GlassTheme.colors.textDim} />
                      <Text style={styles.metaText}>{selected.distance}km</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={11} color={GlassTheme.colors.textDim} />
                    <Text style={styles.metaText} numberOfLines={1}>{selected.openHours}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => setSelectedId(undefined)} hitSlop={8}>
              <Ionicons name="close" size={14} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>
          </View>
        )}

        {/* Results pill — opens the full list sheet */}
        <TouchableOpacity style={styles.resultsPill} onPress={() => setShowResults(true)} activeOpacity={0.8}>
          <Ionicons name="list" size={15} color={GlassTheme.colors.text} />
          <Text style={styles.resultsPillText}>
            {filteredPharmacies.length} {filteredPharmacies.length === 1 ? 'pharmacy' : 'pharmacies'} nearby
          </Text>
          <Ionicons name="chevron-up" size={15} color={GlassTheme.colors.textDim} />
        </TouchableOpacity>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={GlassTheme.colors.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pharmacies, services, areas"
            placeholderTextColor={GlassTheme.colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            autoCorrect={false}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Results sheet ── */}
      <AppBottomSheet
        visible={showResults}
        onClose={() => setShowResults(false)}
        title={`${filteredPharmacies.length} nearby`}
        scrollable
        snapPoints={['55%', '92%']}
      >
        {filteredPharmacies.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.emptyTitle}>No pharmacies found</Text>
            <Text style={styles.emptyHint}>Try adjusting your search or filters.</Text>
          </View>
        ) : (
          filteredPharmacies.map((pharmacy) => (
            <TouchableOpacity
              key={pharmacy.id}
              onPress={() => handlePharmacyPress(pharmacy)}
              style={[styles.listRow, selectedId === pharmacy.id && styles.listRowSelected]}
              activeOpacity={0.7}
            >
              <View style={styles.selectedIcon}>
                <Ionicons name="medical" size={18} color={GlassTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.selectedTitleRow}>
                  <Text style={styles.listName} numberOfLines={1}>{pharmacy.name}</Text>
                  {pharmacy.verified && (
                    <Ionicons name="checkmark-circle" size={13} color={GlassTheme.colors.success} />
                  )}
                </View>
                <Text style={styles.selectedAddr} numberOfLines={1}>{pharmacy.address}</Text>
                <View style={styles.selectedMeta}>
                  {pharmacy.isRegistered === false ? (
                    <Text style={styles.notOnApp}>Not on PharmaLink</Text>
                  ) : (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={11} color={GlassTheme.colors.amber} />
                      <Text style={styles.metaText}>{pharmacy.rating}</Text>
                    </View>
                  )}
                  {pharmacy.distance != null && (
                    <Text style={styles.distanceText}>{pharmacy.distance}km</Text>
                  )}
                  {!pharmacy.isOpen && pharmacy.isRegistered !== false && (
                    <Text style={styles.closedBadge}>Closed</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={17} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>
          ))
        )}
      </AppBottomSheet>

      {/* ── Filters sheet ── */}
      <AppBottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        scrollable
        snapPoints={['70%', '92%']}
      >
        <Text style={styles.filterLabel}>Services</Text>
        <View style={styles.chipWrap}>
          {AVAILABLE_SERVICES.map((service) => {
            const on = selectedServices.includes(service);
            return (
              <TouchableOpacity
                key={service}
                onPress={() => toggleService(service)}
                style={[styles.chip, on && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, on && styles.chipTextActive]}>{service}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.filterLabel}>Minimum rating</Text>
        <View style={styles.chipWrap}>
          {[0, 3, 4, 4.5].map((rating) => {
            const on = minRating === rating;
            return (
              <TouchableOpacity
                key={rating}
                onPress={() => setMinRating(rating)}
                style={[styles.chip, on && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, on && styles.chipTextActive]}>
                  {rating === 0 ? 'Any' : `${rating}+`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.switchRow} onPress={() => setOpenNow(!openNow)} activeOpacity={0.7}>
          <Text style={styles.filterLabelInline}>Open now</Text>
          <View style={[styles.toggle, openNow && styles.toggleActive]}>
            <View style={[styles.toggleThumb, openNow && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <Text style={styles.filterLabel}>Sort by</Text>
        <View style={styles.chipWrap}>
          {([
            { key: 'distance', label: 'Distance' },
            { key: 'rating', label: 'Rating' },
            { key: 'name', label: 'Name' },
          ] as const).map((option) => {
            const on = sortBy === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => setSortBy(option.key)}
                style={[styles.chip, on && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, on && styles.chipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { setShowFilters(false); handleSearch(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        currentLocation={currentLocation}
        title="Select Search Location"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GlassTheme.colors.surfaceAlt },

  // ── Top ──
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: GlassTheme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...GlassTheme.shadow.md,
  },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    backgroundColor: GlassTheme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  locationCard: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GlassTheme.colors.surface,
    borderRadius: GlassTheme.radius.md,
    paddingHorizontal: 10, paddingVertical: 9,
    ...GlassTheme.shadow.md,
  },
  locationIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  locationTitle: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  locationSubtitle: { fontSize: 11, color: GlassTheme.colors.textMuted, marginTop: 1 },

  loadingPill: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GlassTheme.colors.surface,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
    ...GlassTheme.shadow.md,
  },
  loadingText: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.textMuted },

  // ── Bottom ──
  bottomStack: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  fab: {
    alignSelf: 'flex-end',
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: GlassTheme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...GlassTheme.shadow.lg,
  },

  selectedCard: {
    backgroundColor: GlassTheme.colors.surface,
    borderRadius: GlassTheme.radius.md,
    padding: 12,
    ...GlassTheme.shadow.lg,
  },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 18 },
  selectedIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  selectedName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, flexShrink: 1 },
  selectedAddr: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  selectedMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  metaText: { fontSize: 11, color: GlassTheme.colors.textMuted },
  notOnApp: {
    fontSize: 9, fontWeight: '700', color: GlassTheme.colors.textMuted,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: GlassTheme.radius.pill,
  },
  dismissBtn: { position: 'absolute', top: 8, right: 8, padding: 4 },

  resultsPill: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GlassTheme.colors.surface,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: GlassTheme.radius.pill,
    ...GlassTheme.shadow.md,
  },
  resultsPillText: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.text },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GlassTheme.colors.surface,
    borderRadius: GlassTheme.radius.pill,
    paddingHorizontal: 18, height: 52,
    ...GlassTheme.shadow.lg,
  },
  searchInput: { flex: 1, fontSize: 14, color: GlassTheme.colors.text, padding: 0 },

  // ── Sheets ──
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 12, marginBottom: 9,
  },
  listRowSelected: { borderColor: GlassTheme.colors.primary },
  listName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, flexShrink: 1 },
  distanceText: { fontSize: 11, fontWeight: '600', color: GlassTheme.colors.primary },
  closedBadge: {
    fontSize: 9, fontWeight: '700', color: GlassTheme.colors.danger,
    backgroundColor: GlassTheme.colors.dangerLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: GlassTheme.radius.pill,
  },

  emptyCard: { alignItems: 'center', gap: 6, paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 6 },
  emptyHint: { fontSize: 12, color: GlassTheme.colors.textDim },

  filterLabel: {
    fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 18, marginBottom: 10,
  },
  filterLabelInline: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
  },
  chipActive: { backgroundColor: GlassTheme.colors.primary, borderColor: GlassTheme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22,
  },
  toggle: {
    width: 46, height: 26, borderRadius: 13, padding: 2,
    backgroundColor: GlassTheme.colors.divider,
  },
  toggleActive: { backgroundColor: GlassTheme.colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  toggleThumbActive: { transform: [{ translateX: 20 }] },

  filterActions: { flexDirection: 'row', gap: 10, marginTop: 26 },
  clearBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: GlassTheme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    backgroundColor: GlassTheme.colors.surfaceAlt,
  },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  applyBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: GlassTheme.radius.sm,
    backgroundColor: GlassTheme.colors.primary,
  },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
