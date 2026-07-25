import { API } from '@/constants/api';
import * as Location from 'expo-location';
import { getAuthHeaders } from '@/utils/authHeaders';


export type SavedLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
};

export type LocationSuggestion = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  type: 'saved' | 'recent' | 'popular' | 'gps';
};

// Common locations in Ghana
export const POPULAR_LOCATIONS: LocationSuggestion[] = [
  {
    id: 'east-legon',
    name: 'East Legon',
    address: 'East Legon, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    type: 'popular'
  },
  {
    id: 'osu',
    name: 'Osu',
    address: 'Osu, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    type: 'popular'
  },
  {
    id: 'airport-residential',
    name: 'Airport Residential',
    address: 'Airport Residential Area, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    type: 'popular'
  },
  {
    id: 'tema',
    name: 'Tema',
    address: 'Tema, Greater Accra',
    city: 'Tema',
    region: 'Greater Accra',
    type: 'popular'
  },
  {
    id: 'kumasi',
    name: 'Kumasi',
    address: 'Kumasi, Ashanti Region',
    city: 'Kumasi',
    region: 'Ashanti',
    type: 'popular'
  },
  {
    id: 'tamale',
    name: 'Tamale',
    address: 'Tamale, Northern Region',
    city: 'Tamale',
    region: 'Northern',
    type: 'popular'
  },
  {
    id: 'cape-coast',
    name: 'Cape Coast',
    address: 'Cape Coast, Central Region',
    city: 'Cape Coast',
    region: 'Central',
    type: 'popular'
  },
  {
    id: 'takoradi',
    name: 'Takoradi',
    address: 'Takoradi, Western Region',
    city: 'Takoradi',
    region: 'Western',
    type: 'popular'
  }
];

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(`${API.profile}/locations/search?q=${encodeURIComponent(query)}`, {
      headers: await getAuthHeaders(),
    });
    
    if (!res.ok) {
      // Fallback to local search if API fails
      return POPULAR_LOCATIONS.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.city.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return res.json();
  } catch (error) {
    // Fallback to local search
    return POPULAR_LOCATIONS.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.address.toLowerCase().includes(query.toLowerCase()) ||
      location.city.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export async function getSavedLocations(userId: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(`${API.profile}/${userId}/locations`, { headers: await getAuthHeaders() });

    if (!res.ok) {
      return [];
    }

    return res.json();
  } catch (error) {
    return [];
  }
}

export async function saveLocation(userId: string, location: Omit<SavedLocation, 'id'>): Promise<SavedLocation> {
  const res = await fetch(`${API.profile}/${userId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(location),
  });

  if (!res.ok) {
    throw new Error('Failed to save location');
  }

  return res.json();
}

export async function deleteLocation(userId: string, locationId: string): Promise<void> {
  const res = await fetch(`${API.profile}/${userId}/locations/${locationId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to delete location');
  }
}

export async function setDefaultLocation(userId: string, locationId: string): Promise<void> {
  const res = await fetch(`${API.profile}/${userId}/locations/${locationId}/default`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to set default location');
  }
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
    { headers: { 'User-Agent': 'PharmaLink' } }
  );

  const data = await response.json();

  return data.display_name;
}
