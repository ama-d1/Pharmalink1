import { API } from '@/constants/api';

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
  distance?: number; // in kilometers
  isOpen?: boolean;
  verified: boolean;
};

export type PharmacySearchFilters = {
  location?: string;
  radius?: number; // in kilometers
  services?: string[];
  minRating?: number;
  openNow?: boolean;
  sortBy?: 'distance' | 'rating' | 'name';
};

export type PharmacySearchParams = {
  query?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  filters?: PharmacySearchFilters;
};

// Mock pharmacy data for Ghana
export const MOCK_PHARMACIES: Pharmacy[] = [
  {
    id: 'pharmacy-1',
    name: 'Royal Pharmacy',
    address: 'East Legon, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6037,
    longitude: -0.1870,
    phone: '+233 30 251 2345',
    email: 'info@royalpharmacy.gh',
    openHours: '8:00 AM - 10:00 PM',
    rating: 4.5,
    reviewCount: 128,
    services: ['Prescription', 'OTC Medications', 'Health Consultation', 'Blood Pressure Check'],
    description: 'Full-service pharmacy with experienced pharmacists',
    verified: true,
    isOpen: true
  },
  {
    id: 'pharmacy-2',
    name: 'MedPlus Pharmacy',
    address: 'Osu, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5502,
    longitude: -0.1824,
    phone: '+233 30 276 8901',
    openHours: '7:00 AM - 11:00 PM',
    rating: 4.2,
    reviewCount: 89,
    services: ['Prescription', 'OTC Medications', 'Vaccination', 'Medical Devices'],
    description: '24/7 emergency service available',
    verified: true,
    isOpen: true
  },
  {
    id: 'pharmacy-3',
    name: 'HealthCare Pharmacy',
    address: 'Tema, Greater Accra',
    city: 'Tema',
    region: 'Greater Accra',
    latitude: 5.6698,
    longitude: -0.0166,
    phone: '+233 30 320 4567',
    openHours: '8:00 AM - 9:00 PM',
    rating: 4.3,
    reviewCount: 76,
    services: ['Prescription', 'OTC Medications', 'Health Screening'],
    description: 'Convenient location with parking available',
    verified: true,
    isOpen: false
  },
  {
    id: 'pharmacy-4',
    name: 'Kumasi Central Pharmacy',
    address: 'Kumasi Central Market, Kumasi',
    city: 'Kumasi',
    region: 'Ashanti',
    latitude: 6.6885,
    longitude: -1.6244,
    phone: '+233 32 202 3456',
    openHours: '7:30 AM - 8:30 PM',
    rating: 4.0,
    reviewCount: 134,
    services: ['Prescription', 'OTC Medications', 'Traditional Medicine'],
    description: 'Serving Kumasi community for over 20 years',
    verified: true,
    isOpen: true
  },
  {
    id: 'pharmacy-5',
    name: 'Northern Health Pharmacy',
    address: 'Central Tamale, Tamale',
    city: 'Tamale',
    region: 'Northern',
    latitude: 9.4034,
    longitude: -0.8424,
    phone: '+233 37 202 8901',
    openHours: '8:00 AM - 7:00 PM',
    rating: 3.8,
    reviewCount: 45,
    services: ['Prescription', 'OTC Medications', 'Health Consultation'],
    description: 'Main pharmacy serving Northern Region',
    verified: true,
    isOpen: true
  },
  {
    id: 'pharmacy-6',
    name: 'Cape Coast Medical Pharmacy',
    address: 'Cape Coast University, Cape Coast',
    city: 'Cape Coast',
    region: 'Central',
    latitude: 5.1053,
    longitude: -1.2466,
    phone: '+233 33 213 4567',
    openHours: '8:00 AM - 6:00 PM',
    rating: 4.1,
    reviewCount: 67,
    services: ['Prescription', 'OTC Medications', 'Student Health'],
    description: 'Serving university community and residents',
    verified: true,
    isOpen: true
  }
];

export async function getPharmacies(filters?: PharmacySearchFilters): Promise<Pharmacy[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.location) params.append('location', filters.location);
      if (filters.radius) params.append('radius', filters.radius.toString());
      if (filters.services) params.append('services', filters.services.join(','));
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      if (filters.openNow) params.append('openNow', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
    }
    
    const res = await fetch(`${API.pharmacies}${params.toString() ? '?' + params.toString() : ''}`);
    
    if (!res.ok) {
      return applyFiltersToMockData(MOCK_PHARMACIES, filters);
    }
    
    return res.json();
  } catch (error) {
    return applyFiltersToMockData(MOCK_PHARMACIES, filters);
  }
}

export async function searchPharmacies(searchParams: PharmacySearchParams): Promise<Pharmacy[]> {
  try {
    const body = {
      query: searchParams.query,
      userLocation: searchParams.userLocation,
      filters: searchParams.filters
    };
    
    const res = await fetch(`${API.pharmacies}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      return searchMockPharmacies(searchParams);
    }
    
    return res.json();
  } catch (error) {
    return searchMockPharmacies(searchParams);
  }
}

export async function getNearbyPharmacies(
  latitude: number, 
  longitude: number, 
  radius: number = 10
): Promise<Pharmacy[]> {
  try {
    const res = await fetch(`${API.pharmacies}/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    
    if (!res.ok) {
      return calculateNearbyPharmacies(latitude, longitude, radius);
    }
    
    return res.json();
  } catch (error) {
    return calculateNearbyPharmacies(latitude, longitude, radius);
  }
}

export async function getPharmacyById(id: string): Promise<Pharmacy | null> {
  try {
    const res = await fetch(`${API.pharmacies}/${id}`);
    
    if (!res.ok) {
      return MOCK_PHARMACIES.find(p => p.id === id) || null;
    }
    
    return res.json();
  } catch (error) {
    return MOCK_PHARMACIES.find(p => p.id === id) || null;
  }
}

// Helper functions for mock data
function applyFiltersToMockData(pharmacies: Pharmacy[], filters?: PharmacySearchFilters): Pharmacy[] {
  if (!filters) return pharmacies;
  
  let filtered = [...pharmacies];
  
  if (filters.location) {
    filtered = filtered.filter(p => 
      p.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
      p.region.toLowerCase().includes(filters.location!.toLowerCase()) ||
      p.address.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }
  
  if (filters.minRating) {
    filtered = filtered.filter(p => p.rating >= filters.minRating!);
  }
  
  if (filters.openNow) {
    filtered = filtered.filter(p => p.isOpen);
  }
  
  if (filters.services && filters.services.length > 0) {
    filtered = filtered.filter(p => 
      filters.services!.some(service => p.services.includes(service))
    );
  }
  
  // Sort results
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        default:
          return 0;
      }
    });
  }
  
  return filtered;
}

function searchMockPharmacies(searchParams: PharmacySearchParams): Pharmacy[] {
  let results = [...MOCK_PHARMACIES];
  
  if (searchParams.query) {
    const query = searchParams.query.toLowerCase();
    results = results.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query) ||
      p.region.toLowerCase().includes(query) ||
      p.services.some(service => service.toLowerCase().includes(query))
    );
  }
  
  return applyFiltersToMockData(results, searchParams.filters);
}

function calculateNearbyPharmacies(
  userLat: number, 
  userLng: number, 
  radius: number
): Pharmacy[] {
  return MOCK_PHARMACIES.map(pharmacy => {
    const distance = calculateDistance(
      userLat, 
      userLng, 
      pharmacy.latitude, 
      pharmacy.longitude
    );
    
    return {
      ...pharmacy,
      distance: Math.round(distance * 10) / 10
    };
  })
  .filter(pharmacy => pharmacy.distance! <= radius)
  .sort((a, b) => a.distance! - b.distance!);
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}