import { API } from '@/constants/api';

export type HealthTip = {
  id: string;
  content: string;
  category: string;
};

export async function getCurrentHealthTip(): Promise<HealthTip> {
  const res = await fetch(`${API.home}/health-tip/current`);
  return res.json();
}

export async function getHomeSummary(userId: string) {
  const res = await fetch(`${API.home}/summary/${userId}`);
  return res.json();
}
