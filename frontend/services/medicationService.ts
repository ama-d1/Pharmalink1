import { API } from '@/constants/api';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { getAuthHeaders } from '@/utils/authHeaders';

const BASE_URL = API.medications;
const DRUG_URL = API.drugSearch;

// ── Medication CRUD ────────────────────────────────────────────────────────────

// Reads the backend's actual error message out of the response body instead of
// discarding it. medication-service returns { message: "..." } (MedicationResponse)
// on failures (validation errors, ownership checks, etc.) — previously every
// !response.ok here just threw a generic "Request failed (400)" that the outer
// catch then overwrote AGAIN with an even more generic "Network error." message,
// so the user never saw why the request actually failed.
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // body wasn't JSON (or was empty) — fall through to fallback
  }
  return fallback;
}

export const addMedication = async (
  userId: string,
  name: string,
  dosage: string,
  frequency: string,
  reminderTime: string,
  startDate: string,
  instructions?: string
) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ userId, name, dosage, frequency, reminderTime, startDate, instructions }),
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  return await response.json();
};

export const getUserMedications = async (userId: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/user/${userId}`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const updateDoseStatus = async (medicationId: string, status: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/${medicationId}/dose-status?status=${status}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  return await response.json();
};

export const deleteMedication = async (medicationId: string) => {
  const response = await fetchWithTimeout(`${BASE_URL}/${medicationId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Could not delete medication.');
  }
};

export const countActiveMedications = async (userId: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/user/${userId}/count`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  return await response.json();
};

export const getActiveMedicationCount = async (userId: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/user/${userId}/count`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  return await response.json();
};

export const getPendingMedications = async (userId: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/user/${userId}/active`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error('Network error. Please try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Request failed (${response.status})`));
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
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
    // NOTE: /api/drugs/** is not in api-gateway's unauthenticated open-path
    // list (only /api/auth/**, /ws/**, and */health are open) — this route
    // needs the same auth header as everything else, even though it's just
    // a search-suggestion endpoint.
    const res = await fetchWithTimeout(
      `${DRUG_URL}/suggest?q=${encodeURIComponent(query.trim())}&limit=8`,
      { headers: await getAuthHeaders() },
      6000
    );
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
    const res = await fetchWithTimeout(
      `${DRUG_URL}/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
      { headers: await getAuthHeaders() },
      6000
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
    const res = await fetchWithTimeout(`${DRUG_URL}/catalog`, { headers: await getAuthHeaders() }, 6000);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};
