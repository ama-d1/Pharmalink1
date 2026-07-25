import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// UPDATED — this comment previously said the backend admin API didn't exist
// yet. It's since been built: backend/services/admin-service (port 8091)
// implements every route this file calls, aggregating live from auth/
// user-profile/pharmacy/order/community services (per MICROSERVICES_PLAN.md
// step 7c). One important caveat carried over from that doc: /api/admin/**
// requires a valid login token AND (as of the Phase 2 hardening pass) the
// caller's role must be ADMIN — api-gateway 403s any other logged-in user.
// The soft-fail behavior below (returns [] / false / null on error) stays
// as-is regardless, since a real network failure should still degrade
// gracefully rather than crash the admin screens.

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'PATIENT' | 'PHARMACIST' | 'ADMIN' | 'DRIVER';
  status?: 'ACTIVE' | 'DISABLED';
  createdAt?: string;
  // Display-only, populated client-side right after a successful pharmacy
  // assignment (see users.tsx) — the backend's GET /users list doesn't
  // currently join this in, so it won't survive a screen refresh yet. Good
  // enough for immediate feedback after the admin action that set it.
  pharmacyName?: string;
  // Same as pharmacyName above — display-only, set client-side right after
  // assignment, doesn't survive a refresh. 'OWNER' | 'MANAGER'.
  pharmacyRole?: string;
};

export type AdminPharmacy = {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  verified?: boolean;
  createdAt?: string;
};

export type AdminOrder = {
  id: string;
  userId: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
};

export type AdminReportedPost = {
  id: string;
  communityId: string;
  authorName?: string;
  content: string;
  likes?: number;
  commentsCount?: number;
  reportCount?: number;
  createdAt?: string;
};

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { headers: await getAuthHeaders() });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

// ---- Users ----
export function getAllUsers(query?: string): Promise<AdminUser[]> {
  const url = query ? `${API.admin}/users?q=${encodeURIComponent(query)}` : `${API.admin}/users`;
  return getJson(url, []);
}

export async function setUserStatus(userId: string, status: 'ACTIVE' | 'DISABLED'): Promise<boolean> {
  try {
    const res = await fetch(`${API.admin}/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Extended 2026-07-23 for pharmacist provisioning — pharmacyId/pharmacyName
// are optional (only relevant when role is PHARMACIST); the users screen
// only passes them when the admin picked a pharmacy in its picker.
// Further extended same day: pharmacyRole ('OWNER' | 'MANAGER') is optional
// on top of that — only meaningful alongside pharmacyId.
export async function setUserRole(
  userId: string,
  role: 'PATIENT' | 'PHARMACIST' | 'ADMIN' | 'DRIVER',
  pharmacyId?: string,
  pharmacyName?: string,
  pharmacyRole?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API.admin}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(pharmacyId ? { role, pharmacyId, pharmacyName, pharmacyRole } : { role }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Pharmacies ----
export function getAllPharmaciesAdmin(): Promise<AdminPharmacy[]> {
  return getJson(`${API.admin}/pharmacies`, []);
}

export async function setPharmacyVerified(pharmacyId: string, verified: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API.admin}/pharmacies/${pharmacyId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ verified }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createPharmacyAdmin(pharmacy: Partial<AdminPharmacy>): Promise<AdminPharmacy | null> {
  try {
    const res = await fetch(`${API.admin}/pharmacies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(pharmacy),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---- Orders ----
// Was previously getJson(...) — silently returned [] on ANY failure (401/403
// from a stale or non-admin token, admin-service down, network blip), which
// was indistinguishable from "genuinely zero orders" on screen. This surfaces
// the real failure so the admin-orders screen can tell the two apart instead
// of just showing an empty list.
export async function getAllOrdersAdmin(): Promise<{ orders: AdminOrder[]; error: string | null }> {
  try {
    const res = await fetch(`${API.admin}/orders`, { headers: await getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { orders: [], error: 'Access denied — this account may not have admin rights, or the session token is stale. Try logging out and back in.' };
      }
      return { orders: [], error: `Server error (${res.status}) loading orders.` };
    }
    const data = await res.json();
    return { orders: Array.isArray(data) ? data : [], error: null };
  } catch {
    return { orders: [], error: 'Could not reach the server. Check your connection and that admin-service is running.' };
  }
}

// ---- Community moderation ----
export function getReportedPosts(): Promise<AdminReportedPost[]> {
  return getJson(`${API.admin}/community/reports`, []);
}

export async function removePost(postId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API.admin}/community/posts/${postId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeComment(commentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API.admin}/community/comments/${commentId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
