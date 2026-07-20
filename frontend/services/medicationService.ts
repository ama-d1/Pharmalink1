import { API } from '@/constants/api';

const BASE_URL = API.medications;
const DRUG_URL = API.drugSearch;

// ── Medication CRUD ────────────────────────────────────────────────────────────

export const addMedication = async (
  userId: string,
  name: string,
  dosage: string,
  frequency: string,
  reminderTime: string,
  startDate: string,
  instructions?: string
) => {
  try {
    const response = await fetch(`${BASE_URL}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, dosage, frequency, reminderTime, startDate, instructions }),
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const getUserMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const updateDoseStatus = async (medicationId: string, status: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${medicationId}/dose-status?status=${status}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const countActiveMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/count`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const getActiveMedicationCount = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/count`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const getPendingMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/active`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

// ── Drug Search (OpenFDA proxy) ────────────────────────────────────────────────

export type DrugSuggestion = {
  id: string;
  name: string;
  genericName?: string;
  source: 'local' | 'openFDA';
};

export type DrugSearchResult = {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  route?: string;
  dosageForm?: string;
  purpose?: string;
  indications?: string;
  warnings?: string;
  dosageInstructions?: string;
  price?: number;
  inStock?: boolean;
  source: 'local' | 'openFDA';
};

/**
 * Autocomplete suggestions for the medication name field.
 * Calls /api/drugs/suggest?q=...
 * Returns quickly (combines local catalog + OpenFDA generic name search).
 */
export const getDrugSuggestions = async (query: string): Promise<DrugSuggestion[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`${DRUG_URL}/suggest?q=${encodeURIComponent(query.trim())}&limit=8`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

/**
 * Full drug information search.
 * Calls /api/drugs/search?q=...
 * Returns detailed drug info (indications, dosage, warnings, etc.)
 */
export const searchDrugs = async (query: string, limit = 10): Promise<DrugSearchResult[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `${DRUG_URL}/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

/**
 * Fetch the locally seeded drug catalog (available drugs for ordering).
 * Calls /api/drugs/catalog
 */
export const getDrugCatalog = async (): Promise<DrugSearchResult[]> => {
  try {
    const res = await fetch(`${DRUG_URL}/catalog`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};
