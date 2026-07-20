export const API_BASE_URL = 'http://10.17.25.99:8080';

export const API = {
  base: API_BASE_URL,
  auth: `${API_BASE_URL}/api/auth`,
  medications: `${API_BASE_URL}/api/medications`,
  drugSearch: `${API_BASE_URL}/api/drugs`,
  chat: `${API_BASE_URL}/api/chat`,
  home: `${API_BASE_URL}/api/home`,
  pharmacies: `${API_BASE_URL}/api/pharmacies`,
  orders: `${API_BASE_URL}/api/orders`,
  community: `${API_BASE_URL}/api/community`,
  profile: `${API_BASE_URL}/api/profile`,
  delivery: `${API_BASE_URL}/api/delivery`,
  ws: `${API_BASE_URL}/ws`,
} as const;
