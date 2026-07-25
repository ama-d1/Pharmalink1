import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// Talks to the new payment-service (added 2026-07-23, real Paystack
// integration, GHS only — see BACKEND_TODO.md's "Payment" section and
// payment-service's own PaystackClient javadoc for why GHS-only). Replaces
// the old fake orderService.processPayment() flip for real checkouts.

export type InitializedPayment = {
  paymentId: string;
  reference: string;
  authorizationUrl: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
};

export type PaymentResult = {
  id: string;
  orderId: string;
  userId: string;
  amountPesewas: number;
  currency: string;
  ourReference: string;
  authorizationUrl: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
};

export async function initializePayment(
  orderId: string,
  userId: string,
  email: string,
  amountGhs: number
): Promise<InitializedPayment> {
  const res = await fetch(`${API.payments}/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ orderId, userId, email, amountGhs }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Could not start payment (${res.status})`);
  }
  return res.json();
}

export async function verifyPayment(reference: string): Promise<PaymentResult> {
  const res = await fetch(`${API.payments}/verify/${reference}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Could not verify payment (${res.status})`);
  }
  return res.json();
}

// NOTE: payment.tsx's WebView checkout does NOT use this service's base URL
// to detect the Paystack callback — it matches on the path substring
// "/api/payments/callback/" directly (see CALLBACK_PATH_MARKER in
// payment.tsx), because the backend's callback_url host is unrelated to
// this frontend's own resolved API host and was never reachable/relevant —
// see PaymentService.initialize's javadoc on the backend for the full story.
