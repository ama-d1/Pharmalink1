import { API } from '@/constants/api';

export type Location = {
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
    const res = await fetch(`${API.base}/locations/search?q=${encodeURIComponent(query)}`);
    
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

export async function getCurrentLocation(): Promise<LocationSuggestion | null> {
  // This would integrate with expo-location in a real app
  // For now, return a mock GPS location
  return {
    id: 'gps-current',
    name: 'Current Location',
    address: 'Your current location',
    city: 'Accra',
    region: 'Greater Accra',
    type: 'gps'
  };
}

export async function getSavedLocations(userId: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(`${API.base}/users/${userId}/locations`);
    
    if (!res.ok) {
      return [];
    }
    
    return res.json();
  } catch (error) {
    return [];
  }
}

export async function saveLocation(userId: string, location: Omit<Location, 'id'>): Promise<Location> {
  const res = await fetch(`${API.base}/users/${userId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
  
  if (!res.ok) {
    throw new Error('Failed to save location');
  }
  
  return res.json();
}

export async function deleteLocation(userId: string, locationId: string): Promise<void> {
  const res = await fetch(`${API.base}/users/${userId}/locations/${locationId}`, {
    method: 'DELETE',
  });
  
  if (!res.ok) {
    throw new Error('Failed to delete location');
  }
}

export async function setDefaultLocation(userId: string, locationId: string): Promise<void> {
  const res = await fetch(`${API.base}/users/${userId}/locations/${locationId}/default`, {
    method: 'POST',
  });
  
  if (!res.ok) {
    throw new Error('Failed to set default location');
  }
}