import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

export type UserProfile = {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  adherenceRate: number;
  dayStreak: number;
  medicationCount: number;
  appointmentCount: number;
  notificationsEnabled: boolean;
  privacyMode: boolean;
  communityAlerts: boolean;
  appointmentReminders: boolean;
  emailNotifications: boolean;
  // Only meaningful for PHARMACIST accounts (see admin-service's pharmacist
  // provisioning) — null/undefined for everyone else.
  pharmacyId?: string;
  pharmacyName?: string;
  // Added 2026-07-23 — 'OWNER' | 'MANAGER'. Was already returned by the
  // backend (ProfileService.getProfile) but not typed here yet.
  pharmacyRole?: string;
};

export type PharmacyStaffMember = {
  userId: string;
  fullName: string;
  email: string;
  pharmacyRole?: string;
};

export type Appointment = {
  id: string;
  professionalName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
};

// Reads the backend's real error message out of a failed response body
// instead of silently treating any HTTP response (including 4xx/5xx) as
// success — fetch() only rejects on network failure, never on error status
// codes, so every call below used to skip this check entirely.
async function throwIfNotOk(res: Response, fallback: string) {
  if (res.ok) return;
  let message = fallback;
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string' && body.message.trim()) {
      message = body.message;
    }
  } catch {
    // non-JSON body — keep fallback
  }
  throw new Error(message);
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`${API.profile}/${userId}`, { headers: await getAuthHeaders() });
  await throwIfNotOk(res, `Could not load profile (${res.status})`);
  return res.json();
}

export async function updateProfile(userId: string, data: Partial<UserProfile>) {
  const res = await fetch(`${API.profile}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, `Could not update profile (${res.status})`);
  return res.json();
}

export async function updateHealthInfo(userId: string, data: { bloodGroup?: string; allergies?: string; conditions?: string }) {
  const res = await fetch(`${API.profile}/${userId}/health`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, `Could not update health info (${res.status})`);
  return res.json();
}

export async function getAppointments(userId: string): Promise<Appointment[]> {
  const res = await fetch(`${API.profile}/${userId}/appointments`, { headers: await getAuthHeaders() });
  await throwIfNotOk(res, `Could not load appointments (${res.status})`);
  return res.json();
}

export async function bookAppointment(userId: string, data: { professionalName: string; specialty: string; appointmentDate: string; appointmentTime: string }) {
  const res = await fetch(`${API.profile}/${userId}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, `Could not book appointment (${res.status})`);
  return res.json();
}

export async function logDose(userId: string, medicationId: string) {
  const res = await fetch(`${API.profile}/${userId}/dose-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ medicationId }),
  });
  return res.json();
}

export async function getAdherenceReport(userId: string) {
  const res = await fetch(`${API.profile}/${userId}/adherence-report`, { headers: await getAuthHeaders() });
  return res.json();
}

export async function updateSettings(userId: string, data: { notificationsEnabled?: boolean; privacyMode?: boolean; communityAlerts?: boolean; appointmentReminders?: boolean; emailNotifications?: boolean }) {
  const res = await fetch(`${API.profile}/${userId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, `Could not update settings (${res.status})`);
  return res.json();
}

// Added 2026-07-23 for the owner/manager dashboard's staff-list section —
// every pharmacist assigned to this pharmacyId (owner + managers). Backend
// restricts this to admins or to staff who are themselves assigned to this
// exact pharmacy.
export async function getPharmacyStaff(pharmacyId: string): Promise<PharmacyStaffMember[]> {
  try {
    const res = await fetch(`${API.profile}/pharmacy/${pharmacyId}/staff`, { headers: await getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
