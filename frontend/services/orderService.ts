import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';


export type OrderItem = {
  drugName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  userId: string;
  pharmacyId?: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: string;
  paymentStatus: string;
  orderStatus: string;
  // Added 2026-07-23 for the delivery-vs-pickup checkout choice.
  fulfillmentType?: 'PICKUP' | 'DELIVERY';
  deliveryFee?: number;
  createdAt: string;
};

// pharmacyId added 2026-07-23 for the multi-pharmacy price-comparison
// rebuild — optional so any other still-existing call site (there
// shouldn't be one, but belt-and-suspenders) doesn't break.
// fulfillmentType/deliveryFee added same day for the delivery-vs-pickup
// checkout choice — also optional, falls back to the backend's DELIVERY/0
// defaults if omitted.
export async function createOrder(
  userId: string,
  items: OrderItem[],
  deliveryAddress: string,
  paymentMethod: string,
  pharmacyId?: string,
  fulfillmentType?: 'PICKUP' | 'DELIVERY',
  deliveryFee?: number
): Promise<Order> {
  const res = await fetch(`${API.orders}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId, items, deliveryAddress, paymentMethod, pharmacyId, fulfillmentType, deliveryFee }),
  });
  return res.json();
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const res = await fetch(`${API.orders}/user/${userId}`, { headers: await getAuthHeaders() });
  return res.json();
}

export async function getAvailableDrugs() {
  const res = await fetch(`${API.orders}/drugs`, { headers: await getAuthHeaders() });
  return res.json();
}

// Note: the backend only exposes GET /api/orders/drugs (no /drugs/search route),
// so search is done client-side against the full catalog rather than hitting a 404.
export async function searchDrugs(query: string) {
  const drugs = await getAvailableDrugs();
  const q = query.toLowerCase();
  return drugs.filter((drug: any) =>
    drug.name?.toLowerCase().includes(q) ||
    drug.description?.toLowerCase().includes(q) ||
    drug.category?.toLowerCase().includes(q)
  );
}

export async function processPayment(orderId: string, paymentData?: any): Promise<Order> {
  const body = paymentData ? { paymentData } : {};
  const res = await fetch(`${API.orders}/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(body)
  });
  return res.json();
}

export type PharmacyOrderSummary = {
  totalOrders: number;
  paidOrders: number;
  revenue: number;
};

// Added 2026-07-23 for the owner/manager dashboard — a pharmacy's own order
// history and revenue summary. Backend restricts these to that pharmacy's
// own staff (or admin).
export async function getOrdersForPharmacy(pharmacyId: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API.orders}/pharmacy/${pharmacyId}`, { headers: await getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getPharmacyOrderSummary(pharmacyId: string): Promise<PharmacyOrderSummary> {
  const fallback: PharmacyOrderSummary = { totalOrders: 0, paidOrders: 0, revenue: 0 };
  try {
    const res = await fetch(`${API.orders}/pharmacy/${pharmacyId}/summary`, { headers: await getAuthHeaders() });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}
