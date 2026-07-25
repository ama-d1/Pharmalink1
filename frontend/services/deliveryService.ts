import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

export type DeliveryRequest = {
  orderId: string;
  deliverySpeed: 'standard' | 'express' | 'priority';
  address: string;
  phoneNumber: string;
  instructions?: string;
  estimatedFee: number;
};

export type DeliveryStatus = {
  id: string;
  orderId: string;
  // Uppercase — matches the backend's DeliveryStatus enum (Delivery.java)
  // exactly, unlike the lowercase status this type previously claimed (that
  // never matched what the JSON body actually contains).
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  address: string;
  phoneNumber: string;
  instructions?: string;
  deliverySpeed: 'STANDARD' | 'EXPRESS' | 'PRIORITY';
  estimatedFee: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  locationUpdatedAt?: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
};

export async function requestDelivery(deliveryData: DeliveryRequest): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(deliveryData),
  });

  if (!res.ok) {
    // Was previously a hardcoded "Failed to request delivery" that hid the
    // real reason — this is the same double-error-swallowing pattern fixed
    // elsewhere this session (medicationService/profileService). Reading the
    // backend's actual message here is what lets payment.tsx's error alert
    // (and eventually us) tell what's actually going wrong instead of just
    // silently falling back to "couldn't start delivery, contact support".
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Failed to request delivery (${res.status})`);
  }

  return res.json();
}

export async function trackDelivery(trackingNumber: string): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/track/${trackingNumber}`, { headers: await getAuthHeaders() });
  
  if (!res.ok) {
    throw new Error('Failed to track delivery');
  }
  
  return res.json();
}

export async function getDeliveryHistory(userId: string): Promise<DeliveryStatus[]> {
  const res = await fetch(`${API.delivery}/history/${userId}`, { headers: await getAuthHeaders() });
  
  if (!res.ok) {
    throw new Error('Failed to get delivery history');
  }
  
  return res.json();
}

export async function cancelDelivery(deliveryId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API.delivery}/${deliveryId}/cancel`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to cancel delivery');
  }
  
  return res.json();
}

// ── Driver assignment (added 2026-07-23) ────────────────────────────────────
// The "notify all drivers, first to accept wins" pool — see
// DeliveryService.acceptDelivery's backend javadoc for the race-safety
// details.

export async function getAvailableDeliveries(): Promise<DeliveryStatus[]> {
  const res = await fetch(`${API.delivery}/available`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load available deliveries');
  return res.json();
}

export async function getDriverDeliveries(driverId: string): Promise<DeliveryStatus[]> {
  const res = await fetch(`${API.delivery}/driver/${driverId}`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load your deliveries');
  return res.json();
}

// Throws with a message on conflict (already accepted by someone else, HTTP
// 409) — callers should catch and treat that as "refresh the list", not a
// generic failure.
export async function acceptDelivery(deliveryId: string, driverName: string, driverPhone: string): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/${deliveryId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ driverName, driverPhone }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Could not accept this delivery');
  }
  return res.json();
}

export async function updateDeliveryStatus(deliveryId: string, status: 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/${deliveryId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Could not update delivery status');
  }
  return res.json();
}

export async function updateDeliveryLocation(deliveryId: string, latitude: number, longitude: number): Promise<void> {
  await fetch(`${API.delivery}/${deliveryId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function getDeliveryFee(
  fromAddress: string, 
  toAddress: string, 
  deliverySpeed: string
): Promise<{ fee: number; estimatedTime: string }> {
  const params = new URLSearchParams({
    from: fromAddress,
    to: toAddress,
    speed: deliverySpeed,
  });
  
  const res = await fetch(`${API.delivery}/calculate-fee?${params}`, { headers: await getAuthHeaders() });
  
  if (!res.ok) {
    throw new Error('Failed to calculate delivery fee');
  }
  
  return res.json();
}