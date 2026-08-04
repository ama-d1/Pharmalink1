import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';

export type MapPharmacyPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isOpen?: boolean;
  isRegistered?: boolean;
};

export type PharmacyMapHandle = {
  /** Smoothly recentres the camera — used by the floating locate button. */
  focus: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
};

type Props = {
  pharmacies: MapPharmacyPin[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  /** Passed StyleSheet.absoluteFill by the map-first Find Pharmacy screen. */
  style?: StyleProp<ViewStyle>;
  /** Hidden when the screen supplies its own floating locate button. */
  showsMyLocationButton?: boolean;
};

/**
 * Custom pin.
 *
 * `tracksViewChanges` is the important detail: a Marker rendering React
 * children has to re-rasterize that view into a native bitmap, and leaving
 * tracking on permanently tanks Android frame rates once there are more than
 * a handful of pins. Leaving it OFF from the start is the opposite failure —
 * the pin renders blank because it never rasterized at all. So: track briefly
 * after mount (and after any selection change, which resizes the pin), then
 * stop.
 */
function PharmacyPin({
  pin,
  selected,
  onPress,
}: {
  pin: MapPharmacyPin;
  selected: boolean;
  onPress: () => void;
}) {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(timer);
  }, [selected]);

  const closed = pin.isOpen === false;
  const unregistered = pin.isRegistered === false;

  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 10 : 1}
    >
      <View style={[styles.pin, selected && styles.pinSelected, closed && styles.pinClosed]}>
        <Ionicons
          name={unregistered ? 'medical-outline' : 'medical'}
          size={selected ? 17 : 14}
          color={selected ? '#FFFFFF' : closed ? GlassTheme.colors.textMuted : GlassTheme.colors.primary}
        />
      </View>
    </Marker>
  );
}

export const PharmacyMap3D = forwardRef<PharmacyMapHandle, Props>(function PharmacyMap3D(
  { pharmacies, selectedId, onSelect, userLocation, style, showsMyLocationButton = true },
  ref
) {
  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo<Region>(() => {
    const center =
      userLocation ??
      (pharmacies[0] ? { latitude: pharmacies[0].latitude, longitude: pharmacies[0].longitude } : null) ??
      { latitude: 5.6037, longitude: -0.187 }; // Accra fallback

    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [userLocation, pharmacies]);

  useImperativeHandle(ref, () => ({
    focus: (coords, zoom = 0.02) => {
      mapRef.current?.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: zoom, longitudeDelta: zoom },
        450
      );
    },
  }));

  // Empty state renders the map anyway (rather than a grey placeholder) so
  // the user still gets their own location and can pan around — "no results
  // near this point" is not the same as "no map".
  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={showsMyLocationButton}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
      >
        {pharmacies.map((p) => (
          <PharmacyPin
            key={p.id}
            pin={p}
            selected={p.id === selectedId}
            onPress={() => onSelect?.(p.id)}
          />
        ))}
      </MapView>

      {pharmacies.length === 0 && (
        <View pointerEvents="none" style={styles.emptyBanner}>
          <Text style={styles.emptyText}>No pharmacies to show here yet</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GlassTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...GlassTheme.shadow.md,
  },
  pinSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.primary,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  pinClosed: {
    borderColor: GlassTheme.colors.divider,
  },
  emptyBanner: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,27,38,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
