import { API } from '@/constants/api';

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
};

export type Appointment = {
  id: string;
  professionalName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
};

export async function getProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`${API.profile}/${userId}`);
  return res.json();
}

export async function updateProfile(userId: string, data: Partial<UserProfile>) {
  const res = await fetch(`${API.profile}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateHealthInfo(userId: string, data: { bloodGroup?: string; allergies?: string; conditions?: string }) {
  const res = await fetch(`${API.profile}/${userId}/health`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getAppointments(userId: string): Promise<Appointment[]> {
  const res = await fetch(`${API.profile}/${userId}/appointments`);
  return res.json();
}

export async function bookAppointment(userId: string, data: { professionalName: string; specialty: string; appointmentDate: string; appointmentTime: string }) {
  const res = await fetch(`${API.profile}/${userId}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function logDose(userId: string, medicationId: string) {
  const res = await fetch(`${API.profile}/${userId}/dose-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicationId }),
  });
  return res.json();
}

export async function getAdherenceReport(userId: string) {
  const res = await fetch(`${API.profile}/${userId}/adherence-report`);
  return res.json();
}

export async function updateSettings(userId: string, data: { notificationsEnabled?: boolean; privacyMode?: boolean }) {
  const res = await fetch(`${API.profile}/${userId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
