import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// API.pharmacies is read at call time — see constants/api.ts on why the URL
// must not be captured in a module-level const.

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
  // Added for task 63 (real nearby pharmacies via OpenStreetMap): only
  // /nearby can return isRegistered=false/source="osm" rows — informational
  // pins with no PharmaLink stock/checkout behind them, not yet on the
  // platform. Every other endpoint always returns isRegistered=true.
  isRegistered?: boolean;
  source?: 'pharmalink' | 'osm';
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

export type PharmacyReview = {
  id: string;
  pharmacyId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
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
    const url = params.toString() ? `${API.pharmacies}?${params}` : API.pharmacies;
    const res = await fetch(url, { headers: await getAuthHeaders() });
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
    const res = await fetch(`${API.pharmacies}/${id}`, { headers: await getAuthHeaders() });
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
    const res = await fetch(`${API.pharmacies}/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`, {
      headers: await getAuthHeaders(),
    });
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
    const res = await fetch(`${API.pharmacies}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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

/**
 * GET /api/pharmacies/:id/reviews
 * Coming-soon roadmap item #2 — public, no auth required to read reviews.
 */
export async function getPharmacyReviews(pharmacyId: string): Promise<PharmacyReview[]> {
  try {
    const res = await fetch(`${API.pharmacies}/${pharmacyId}/reviews`, { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[pharmacyService] getPharmacyReviews failed:', err);
    return [];
  }
}

/**
 * POST /api/pharmacies/:id/reviews
 * Create-or-update: submitting again just edits your existing review for
 * this pharmacy (one review per user per pharmacy, enforced server-side).
 */
export async function submitPharmacyReview(
  pharmacyId: string,
  rating: number,
  comment: string,
): Promise<PharmacyReview> {
  const res = await fetch(`${API.pharmacies}/${pharmacyId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * DELETE /api/pharmacies/:id/reviews/:reviewId
 * Backend enforces author-or-admin ownership — a 403 here means the
 * frontend showed a delete button it shouldn't have (shouldn't happen,
 * since it only ever renders on the caller's own review).
 */
export async function deletePharmacyReview(pharmacyId: string, reviewId: string): Promise<void> {
  const res = await fetch(`${API.pharmacies}/${pharmacyId}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
}
