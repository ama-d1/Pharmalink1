import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import {
  LocationSuggestion,
  POPULAR_LOCATIONS,
  searchLocations,
  getCurrentLocation,
  getSavedLocations,
  reverseGeocode,
} from '@/services/locationService';
import { useAuth } from '@/context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationSuggestion) => void;
  currentLocation?: string;
  title?: string;
};

export function LocationPickerModal({ 
  visible, 
  onClose, 
  onSelect, 
  currentLocation,
  title = 'Select Location'
}: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationSuggestion[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LocationSuggestion | null>(null);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const loadInitialData = async () => {
    try {
      // FIXED — this used to do `setGpsLocation(currentGpsLocation)` directly
      // with the raw `{latitude, longitude}` getCurrentLocation() returns,
      // even though gpsLocation is typed as a full LocationSuggestion (with
      // .address/.name/.id). Tapping "Use Current Location" then called
      // onSelect with an object missing all of those fields, so
      // delivery.tsx's handleLocationSelect (`location.address`) silently
      // set the address to undefined — this was the actual bug behind
      // "auto-detect location doesn't work". Reverse-geocoding the raw
      // coordinates into a real address before building the
      // LocationSuggestion is what was missing.
      const coords = await getCurrentLocation();
      try {
        const displayName = await reverseGeocode(coords.latitude, coords.longitude);
        setGpsLocation({
          id: 'gps-current',
          name: 'Current Location',
          address: displayName || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
          city: '',
          region: '',
          type: 'gps',
        });
      } catch {
        // Reverse geocoding failed (e.g. no network reaching Nominatim) —
        // still offer raw coordinates rather than nothing, since we do at
        // least know where the user is.
        setGpsLocation({
          id: 'gps-current',
          name: 'Current Location',
          address: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
          city: '',
          region: '',
          type: 'gps',
        });
      }

      // Load saved locations if user is logged in
      if (user?.userId) {
        const saved = await getSavedLocations(user.userId);
        setSavedLocations(saved);
      }

      // Load recent locations from storage (mock for now)
      setRecentLocations([
        {
          id: 'recent-1',
          name: 'Last used location',
          address: currentLocation || 'East Legon, Accra',
          city: 'Accra',
          region: 'Greater Accra',
          type: 'recent'
        }
      ]);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchLocations(query);
      setSuggestions(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    onSelect(location);
    onClose();
  };

  const handleUseGPS = () => {
    Alert.alert(
      'Use GPS Location',
      'This will use your current GPS coordinates to determine your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Use GPS', 
          onPress: () => {
            if (gpsLocation) {
              handleSelectLocation(gpsLocation);
            } else {
              Alert.alert('Error', 'Could not get your current location');
            }
          }
        }
      ]
    );
  };

  const LocationItem = ({ location, icon }: { location: LocationSuggestion; icon: string }) => (
    <TouchableOpacity 
      onPress={() => handleSelectLocation(location)}
      style={styles.locationItem}
    >
      <GlassCard style={styles.locationCard}>
        <View style={styles.locationContent}>
          <View style={styles.locationLeft}>
            <View style={styles.locationIcon}>
              <Ionicons name={icon as any} size={20} color={GlassTheme.colors.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{location.name}</Text>
              <Text style={styles.locationAddress}>{location.address}</Text>
              {location.region && (
                <Text style={styles.locationRegion}>{location.region}</Text>
              )}
            </View>
          </View>
          <View style={styles.locationRight}>
            <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textMuted} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GlassBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="close" size={22} color={GlassTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Search */}
            <View style={styles.searchSection}>
              <GlassInput
                placeholder="Search for a location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon="search"
                style={styles.searchInput}
              />
              {isSearching && (
                <Text style={styles.searchingText}>Searching...</Text>
              )}
            </View>

            {/* GPS Location */}
            <GlassCard style={styles.gpsCard}>
              <TouchableOpacity onPress={handleUseGPS} style={styles.gpsContent}>
                <View style={styles.gpsLeft}>
                  <View style={styles.gpsIcon}>
                    <Ionicons name="locate" size={20} color={GlassTheme.colors.accent} />
                  </View>
                  <View>
                    <Text style={styles.gpsTitle}>Use Current Location</Text>
                    <Text style={styles.gpsSubtitle}>Use GPS to detect your location</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>

            {/* Search Results */}
            {searchQuery && suggestions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {suggestions.map((location) => (
                  <LocationItem 
                    key={location.id} 
                    location={location} 
                    icon="location" 
                  />
                ))}
              </>
            )}

            {/* No Results */}
            {searchQuery && suggestions.length === 0 && !isSearching && (
              <GlassCard style={styles.noResultsCard}>
                <Ionicons name="search" size={32} color={GlassTheme.colors.textMuted} />
                <Text style={styles.noResultsTitle}>No locations found</Text>
                <Text style={styles.noResultsText}>
                  Try a different search term or check your spelling
                </Text>
              </GlassCard>
            )}

            {/* Saved Locations */}
            {!searchQuery && savedLocations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Saved Locations</Text>
                {savedLocations.map((location) => (
                  <LocationItem 
                    key={location.id} 
                    location={location} 
                    icon="bookmark" 
                  />
                ))}
              </>
            )}

            {/* Recent Locations */}
            {!searchQuery && recentLocations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent</Text>
                {recentLocations.map((location) => (
                  <LocationItem 
                    key={location.id} 
                    location={location} 
                    icon="time" 
                  />
                ))}
              </>
            )}

            {/* Popular Locations */}
            {!searchQuery && (
              <>
                <Text style={styles.sectionTitle}>Popular Locations</Text>
                {POPULAR_LOCATIONS.map((location) => (
                  <LocationItem 
                    key={location.id} 
                    location={location} 
                    icon="trending-up" 
                  />
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },

  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    marginBottom: 8,
  },
  searchingText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },

  gpsCard: {
    marginBottom: 20,
  },
  gpsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gpsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,184,166,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsTitle: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  gpsSubtitle: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginBottom: 12,
    marginTop: 8,
  },

  locationItem: {
    marginBottom: 8,
  },
  locationCard: {
    padding: 0,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    color: GlassTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  locationAddress: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  locationRegion: {
    color: GlassTheme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  locationRight: {
    padding: 4,
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