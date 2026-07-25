import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// Roadmap: "Rate driver after delivery". Mirrors pharmacyService.ts's
// review functions in style (upsert-by-user, backend error message
// surfaced via body.message on failure).

const BASE = API.delivery;

export type DriverRating = {
  id: string;
  deliveryId: string;
  driverId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * GET /api/delivery/:deliveryId/rating
 * Returns the current user's rating for this delivery if one exists, else
 * null (backend responds 200 with {rating: null}, not 404).
 */
export async function getDriverRatingForDelivery(deliveryId: string): Promise<DriverRating | null> {
  const res = await fetch(`${BASE}/${deliveryId}/rating`, { headers: await getAuthHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data && data.id ? data : null;
}

/**
 * POST /api/delivery/:deliveryId/rating
 * Create-or-update: submitting again just edits the existing rating for
 * this delivery (one rating per delivery, enforced server-side).
 */
export async function submitDriverRating(
  deliveryId: string,
  rating: number,
  comment: string,
): Promise<DriverRating> {
  const res = await fetch(`${BASE}/${deliveryId}/rating`, {
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
