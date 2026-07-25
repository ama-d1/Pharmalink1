import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

export type HealthTip = {
  id: string;
  content: string;
  category: string;
};

export async function getCurrentHealthTip(): Promise<HealthTip> {
  const res = await fetch(`${API.home}/health-tip/current`, { headers: await getAuthHeaders() });
  return res.json();
}

export async function getHomeSummary(userId: string) {
  const res = await fetch(`${API.home}/summary/${userId}`, { headers: await getAuthHeaders() });
  return res.json();
}
