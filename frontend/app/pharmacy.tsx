import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PharmacyMap3D } from '@/components/3d/PharmacyMap3D';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { 
  getPharmacies, 
  searchPharmacies, 
  getNearbyPharmacies,
  Pharmacy, 
  PharmacySearchFilters,
  PharmacySearchParams
} from '@/services/pharmacyService';
import { LocationSuggestion } from '@/services/locationService';

export default function PharmacyScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Accra, Ghana');
  
  // Filter states
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [showFilters, setShowFilters] = useState(false);

  const availableServices = [
    'Prescription',
    'OTC Medications', 
    'Health Consultation',
    'Vaccination',
    'Blood Pressure Check',
    'Health Screening',
    'Medical Devices',
    'Traditional Medicine',
    'Student Health'
  ];

  useEffect(() => {
    loadPharmacies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setFilteredPharmacies(pharmacies);
    }
  }, [searchQuery, pharmacies]);

  const loadPharmacies = async () => {
    setLoading(true);
    try {
      const data = await getPharmacies();
      setPharmacies(data);
      setFilteredPharmacies(data);
      if (data[0]) setSelectedId(data[0].id);
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedServices.length === 0) {
      setFilteredPharmacies(pharmacies);
      return;
    }

    setLoading(true);
    try {
      const searchParams: PharmacySearchParams = {
        query: searchQuery,
        filters: {
          location: currentLocation,
          services: selectedServices.length > 0 ? selectedServices : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          openNow: openNow,
          sortBy: sortBy
        }
      };

      const results = await searchPharmacies(searchParams);
      setFilteredPharmacies(results);
      
      if (results.length > 0 && (!selectedId || !results.find(p => p.id === selectedId))) {
        setSelectedId(results[0].id);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setCurrentLocation(location.address);
    // Optionally trigger a new search with the new location
    if (searchQuery.trim() || selectedServices.length > 0) {
      handleSearch();
    }
  };

  const handleNearbyPharmacies = () => {
    Alert.alert(
      'Find Nearby Pharmacies',
      'This will use your GPS location to find the nearest pharmacies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Use GPS', 
          onPress: async () => {
            setLoading(true);
            try {
              // In a real app, you'd get actual GPS coordinates
              const mockLat = 5.6037; // Accra coordinates
              const mockLng = -0.1870;
              const nearbyPharmacies = await getNearbyPharmacies(mockLat, mockLng, 10);
              setFilteredPharmacies(nearbyPharmacies);
              if (nearbyPharmacies[0]) setSelectedId(nearbyPharmacies[0].id);
            } catch (error) {
              Alert.alert('Error', 'Could not get nearby pharmacies');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePharmacyPress = (pharmacy: Pharmacy) => {
    setSelectedId(pharmacy.id);
    router.push({
      pathname: '/pharmacy-details',
      params: { id: pharmacy.id }
    });
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const clearFilters = () => {
    setSelectedServices([]);
    setMinRating(0);
    setOpenNow(false);
    setSortBy('distance');
    setSearchQuery('');
  };

  const applyFilters = () => {
    handleSearch();
    setShowFilters(false);
  };

  const mapPins = useMemo(
    () =>
      filteredPharmacies.map((p, i) => ({
        id: p.id,
        name: p.name,
        x: 0.15 + (i % 4) * 0.22,
        y: 0.25 + Math.floor(i / 4) * 0.35,
      })),
    [filteredPharmacies]
  );

  const selected = filteredPharmacies.find((p) => p.id === selectedId);

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Find Pharmacies</Text>
          <TouchableOpacity onPress={handleNearbyPharmacies} style={styles.nearbyBtn}>
            <Ionicons name="locate" size={20} color={GlassTheme.colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <GlassInput
              placeholder="Search pharmacies, services, locations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              icon="search"
              style={styles.searchInput}
            />
            
            {/* Location and Filters */}
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                onPress={() => setShowLocationPicker(true)} 
                style={styles.locationBtn}
              >
                <Ionicons name="location" size={16} color={GlassTheme.colors.accent} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {currentLocation}
                </Text>
                <Ionicons name="chevron-down" size={16} color={GlassTheme.colors.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowFilters(!showFilters)} 
                style={[
                  styles.filterBtn,
                  (selectedServices.length > 0 || minRating > 0 || openNow) && styles.filterBtnActive
                ]}
              >
                <Ionicons name="options" size={16} color={GlassTheme.colors.text} />
                <Text style={styles.filterText}>Filters</Text>
                {(selectedServices.length > 0 || minRating > 0 || openNow) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {selectedServices.length + (minRating > 0 ? 1 : 0) + (openNow ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters Panel */}
          {showFilters && (
            <GlassCard style={styles.filtersPanel}>
              <Text style={styles.filtersTitle}>Filter Options</Text>
              
              {/* Services Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Services</Text>
                <View style={styles.servicesGrid}>
                  {availableServices.map(service => (
                    <TouchableOpacity
                      key={service}
                      onPress={() => toggleService(service)}
                      style={[
                        styles.serviceChip,
                        selectedServices.includes(service) && styles.serviceChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.serviceChipText,
                        selectedServices.includes(service) && styles.serviceChipTextSelected
                      ]}>
                        {service}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rating Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Minimum Rating</Text>
                <View style={styles.ratingRow}>
                  {[0, 3, 4, 4.5].map(rating => (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setMinRating(rating)}
                      style={[
                        styles.ratingBtn,
                        minRating === rating && styles.ratingBtnSelected
                      ]}
                    >
                      <Text style={styles.ratingBtnText}>
                        {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Open Now Filter */}
              <View style={styles.filterGroup}>
                <TouchableOpacity 
                  onPress={() => setOpenNow(!openNow)}
                  style={styles.openNowRow}
                >
                  <Text style={styles.filterLabel}>Open Now</Text>
                  <View style={[styles.toggle, openNow && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, openNow && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sort By */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.sortRow}>
                  {[
                    { key: 'distance', label: 'Distance' },
                    { key: 'rating', label: 'Rating' },
                    { key: 'name', label: 'Name' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setSortBy(option.key as any)}
                      style={[
                        styles.sortBtn,
                        sortBy === option.key && styles.sortBtnSelected
                      ]}
                    >
                      <Text style={styles.sortBtnText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterActions}>
                <GlassButton 
                  label="Clear All" 
                  onPress={clearFilters}
                  style={styles.clearBtn}
                />
                <GlassButton 
                  label="Apply Filters" 
                  onPress={applyFilters}
                  style={styles.applyBtn}
                />
              </View>
            </GlassCard>
          )}

          {/* Results Count */}
          <Text style={styles.resultsCount}>
            {loading ? 'Searching...' : `${filteredPharmacies.length} pharmacies found`}
          </Text>

          {/* 3D Map */}
          <PharmacyMap3D pharmacies={mapPins} selectedId={selectedId} />

          {/* Selected Pharmacy Info */}
          {selected && (
            <GlassCard gradient glow style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selected.name}</Text>
                  <Text style={styles.selectedAddr}>{selected.address}</Text>
                  {selected.description && (
                    <Text style={styles.selectedDesc}>{selected.description}</Text>
                  )}
                </View>
                {selected.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={GlassTheme.colors.accent} />
                  <Text style={styles.metaText}>{selected.openHours}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={14} color={GlassTheme.colors.amber} />
                  <Text style={styles.metaText}>{selected.rating} ({selected.reviewCount})</Text>
                </View>
                {selected.distance && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={14} color={GlassTheme.colors.accent} />
                    <Text style={styles.metaText}>{selected.distance}km</Text>
                  </View>
                )}
              </View>

              {selected.services.length > 0 && (
                <View style={styles.servicesRow}>
                  {selected.services.slice(0, 3).map(service => (
                    <View key={service} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{service}</Text>
                    </View>
                  ))}
                  {selected.services.length > 3 && (
                    <Text style={styles.moreServices}>+{selected.services.length - 3} more</Text>
                  )}
                </View>
              )}
            </GlassCard>
          )}

          {/* Pharmacy List */}
          <Text style={styles.sectionTitle}>All Pharmacies</Text>
          {filteredPharmacies.map((pharmacy) => (
            <TouchableOpacity 
              key={pharmacy.id} 
              onPress={() => handlePharmacyPress(pharmacy)}
              style={styles.pharmacyItem}
            >
              <GlassCard style={[
                styles.pharmacyCard,
                selectedId === pharmacy.id && styles.pharmacyCardSelected
              ]}>
                <View style={styles.pharmacyRow}>
                  <View style={styles.pharmacyIcon}>
                    <Ionicons name="medical" size={20} color={GlassTheme.colors.accent} />
                  </View>
                  <View style={styles.pharmacyInfo}>
                    <View style={styles.pharmacyHeader}>
                      <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                      {pharmacy.verified && (
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      )}
                      {!pharmacy.isOpen && (
                        <Text style={styles.closedBadge}>Closed</Text>
                      )}
                    </View>
                    <Text style={styles.pharmacyAddr}>{pharmacy.address}</Text>
                    <View style={styles.pharmacyMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color={GlassTheme.colors.amber} />
                        <Text style={styles.ratingText}>{pharmacy.rating}</Text>
                      </View>
                      {pharmacy.distance && (
                        <Text style={styles.distanceText}>{pharmacy.distance}km</Text>
                      )}
                      <Text style={styles.hoursText}>{pharmacy.openHours}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}

          {filteredPharmacies.length === 0 && !loading && (
            <GlassCard style={styles.noResultsCard}>
              <Ionicons name="search" size={48} color={GlassTheme.colors.textMuted} />
              <Text style={styles.noResultsTitle}>No pharmacies found</Text>
              <Text style={styles.noResultsText}>
                Try adjusting your search terms or filters
              </Text>
            </GlassCard>
          )}
        </ScrollView>

        {/* Location Picker Modal */}
        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          currentLocation={currentLocation}
          title="Select Search Location"
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 20, 
    gap: 12 
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
    flex: 1 
  },
  nearbyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(20,184,166,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  
  searchSection: { gap: 12 },
  searchInput: { marginBottom: 0 },
  controlsRow: { flexDirection: 'row', gap: 12 },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  locationText: {
    flex: 1,
    color: GlassTheme.colors.text,
    fontSize: 14,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(20,184,166,0.2)',
    borderColor: GlassTheme.colors.accent,
  },
  filterText: {
    color: GlassTheme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: GlassTheme.colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },

  filtersPanel: { marginBottom: 8 },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text,
    marginBottom: 16,
  },
  filterGroup: { marginBottom: 16 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GlassTheme.colors.text,
    marginBottom: 8,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceChipSelected: {
    backgroundColor: 'rgba(20,184,166,0.2)',
    borderColor: GlassTheme.colors.accent,
  },
  serviceChipText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  serviceChipTextSelected: {
    color: GlassTheme.colors.accent,
  },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  ratingBtnSelected: {
    backgroundColor: GlassTheme.colors.accent,
  },
  ratingBtnText: {
    color: GlassTheme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  openNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: GlassTheme.colors.accent,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  sortBtnSelected: {
    backgroundColor: GlassTheme.colors.accent,
  },
  sortBtnText: {
    color: GlassTheme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  applyBtn: {
    flex: 1,
  },

  resultsCount: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },

  selectedCard: { marginBottom: 8 },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  selectedInfo: { flex: 1 },
  selectedName: { 
    color: GlassTheme.colors.text, 
    fontSize: 17, 
    fontWeight: '700' 
  },
  selectedAddr: { 
    color: GlassTheme.colors.textMuted, 
    fontSize: 13, 
    marginTop: 4 
  },
  selectedDesc: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { 
    color: GlassTheme.colors.textMuted, 
    fontSize: 12 
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  serviceTag: {
    backgroundColor: 'rgba(20,184,166,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceTagText: {
    color: GlassTheme.colors.accent,
    fontSize: 10,
    fontWeight: '500',
  },
  moreServices: {
    color: GlassTheme.colors.textMuted,
    fontSize: 10,
    alignSelf: 'center',
  },

  sectionTitle: { 
    color: GlassTheme.colors.text, 
    fontWeight: '700', 
    fontSize: 15,
    marginTop: 8,
  },
  pharmacyItem: { marginBottom: 8 },
  pharmacyCard: { padding: 0 },
  pharmacyCardSelected: { 
    borderColor: GlassTheme.colors.accent 
  },
  pharmacyRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    padding: 16,
  },
  pharmacyIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  pharmacyInfo: { flex: 1 },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pharmacyName: { 
    color: GlassTheme.colors.text, 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  closedBadge: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pharmacyAddr: { 
    color: GlassTheme.colors.textMuted, 
    fontSize: 12, 
    marginBottom: 4,
  },
  pharmacyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 11,
  },
  distanceText: {
    color: GlassTheme.colors.accent,
    fontSize: 11,
    fontWeight: '500',
  },
  hoursText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 11,
  },

  noResultsCard: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  noResultsTitle: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  noResultsText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});