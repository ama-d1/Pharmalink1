import { API } from '@/constants/api';

const BASE = API.pharmacies;

// ── Types ──────────────────────────────────────────────────────────────────────

export type Pharmacy = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  website?: string;
  openHours: string;
  rating: number;
  reviewCount: number;
  services: string[];
  description?: string;
  imageUrl?: string;
  distance?: number; // km, computed by backend for nearby/search calls
  isOpen?: boolean;
  verified: boolean;
};

export type PharmacySearchFilters = {
  location?: string;
  radius?: number; // km
  services?: string[];
  minRating?: number;
  openNow?: boolean;
  sortBy?: 'distance' | 'rating' | 'name';
};

export type PharmacySearchParams = {
  query?: string;
  userLocation?: { latitude: number; longitude: number };
  filters?: PharmacySearchFilters;
};

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * GET /api/pharmacies
 * Optionally accepts filter params as query string (location, minRating, openNow, sortBy).
 */
export async function getPharmacies(filters?: PharmacySearchFilters): Promise<Pharmacy[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.location)  params.append('location',  filters.location);
      if (filters.radius)    params.append('radius',    filters.radius.toString());
      if (filters.services)  params.append('services',  filters.services.join(','));
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      if (filters.openNow)   params.append('openNow',   'true');
      if (filters.sortBy)    params.append('sortBy',    filters.sortBy);
    }
    const url = params.toString() ? `${BASE}?${params}` : BASE;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[pharmacyService] getPharmacies failed:', err);
    return [];
  }
}

/**
 * GET /api/pharmacies/:id
 */
export async function getPharmacyById(id: string): Promise<Pharmacy | null> {
  try {
    const res = await fetch(`${BASE}/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn('[pharmacyService] getPharmacyById failed:', err);
    return null;
  }
}

/**
 * GET /api/pharmacies/nearby?lat=X&lng=Y&radius=Z
 * Returns pharmacies sorted nearest-first, each with a `distance` field (km).
 */
export async function getNearbyPharmacies(
  latitude: number,
  longitude: number,
  radius = 10,
): Promise<Pharmacy[]> {
  try {
    const res = await fetch(`${BASE}/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[pharmacyService] getNearbyPharmacies failed:', err);
    return [];
  }
}

/**
 * POST /api/pharmacies/search
 * Full-featured search: free-text query + user GPS location + filters.
 */
export async function searchPharmacies(searchParams: PharmacySearchParams): Promise<Pharmacy[]> {
  try {
    const res = await fetch(`${BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchParams.query,
        userLocation: searchParams.userLocation,
        filters: searchParams.filters,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[pharmacyService] searchPharmacies failed:', err);
    return [];
  }
}
