import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// Added 2026-07-23 alongside pharmacy-service's new PharmacyStock entity —
// see that entity's javadoc (backend) for the full feature context. Two
// audiences: a pharmacist managing their own pharmacy's stock/pricing
// (getStock/upsertStock/deleteStock), and any user comparing prices across
// pharmacies for a medication (searchAcrossPharmacies) — the latter backs
// the Home screen's rebuilt Order Meds flow.

export type PharmacyStock = {
  id: string;
  pharmacyId: string;
  drugId: string;
  drugName: string;
  price: number;
  quantity: number;
  // Added 2026-07-23 — a data: URI (base64), not a hosted URL. No cloud
  // image storage is set up for this project yet, so the photo is stored
  // directly in Postgres and rendered straight from this string (React
  // Native's <Image source={{ uri: imageBase64 }}> handles data: URIs
  // natively, no separate download step needed). Undefined/null = no photo.
  imageBase64?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PharmacyPriceComparisonRow = {
  stockId: string;
  drugId: string;
  drugName: string;
  price: number;
  quantity: number;
  imageBase64?: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyCity?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
};

export async function getStock(pharmacyId: string): Promise<PharmacyStock[]> {
  try {
    const res = await fetch(`${API.pharmacies}/${pharmacyId}/stock`, { headers: await getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// imageBase64: omit/undefined leaves whatever photo already exists on the
// row untouched (see backend PharmacyStockService.upsertStock's javadoc);
// pass an empty string to explicitly remove an existing photo.
export async function upsertStock(
  pharmacyId: string,
  drugId: string,
  drugName: string,
  price: number,
  quantity: number,
  imageBase64?: string
): Promise<PharmacyStock | null> {
  try {
    const body: Record<string, unknown> = { drugId, drugName, price, quantity };
    if (imageBase64 !== undefined) body.imageBase64 = imageBase64;
    const res = await fetch(`${API.pharmacies}/${pharmacyId}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteStock(pharmacyId: string, stockId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API.pharmacies}/${pharmacyId}/stock/${stockId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchAcrossPharmacies(drugName: string): Promise<PharmacyPriceComparisonRow[]> {
  if (!drugName.trim()) return [];
  try {
    const res = await fetch(`${API.pharmacies}/stock-search?drugName=${encodeURIComponent(drugName.trim())}`, {
      headers: await getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
