import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlassTheme } from '@/constants/glassTheme';

export type MapPharmacyPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isOpen?: boolean;
};

type Props = {
  pharmacies: MapPharmacyPin[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
};

export function PharmacyMap3D({ pharmacies, selectedId, onSelect, userLocation }: Props) {
  const initialRegion = useMemo(() => {
    const center =
      userLocation ??
      (pharmacies[0] ? { latitude: pharmacies[0].latitude, longitude: pharmacies[0].longitude } : null) ??
      { latitude: 5.6037, longitude: -0.187 }; // Accra fallback

    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [userLocation, pharmacies]);

  if (pharmacies.length === 0) {
    return (
      <View style={[styles.wrap, styles.empty]}>
        <Text style={styles.emptyText}>No pharmacies to show on the map yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {pharmacies.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.name}
            description={p.isOpen === false ? 'Closed' : 'Open now'}
            pinColor={p.id === selectedId ? GlassTheme.colors.primary : GlassTheme.colors.accent}
            onPress={() => onSelect?.(p.id)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 260,
    borderRadius: GlassTheme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GlassTheme.colors.glassBorder,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});