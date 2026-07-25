import Constants from 'expo-constants';

// The backend base URL used to be a single hardcoded LAN IP
// (http://172.20.10.7:8080) with no fallback logic — that IP was whatever
// the developer's machine happened to have on a specific WiFi/hotspot at the
// time, and every time the network changed (different WiFi, hotspot restart,
// router reassigning DHCP leases, etc.) every API call in the app would fail
// with "could not connect to server" until someone noticed and hand-edited
// this file or .env. That's almost certainly what's been happening.
//
// Fix: resolve the host automatically from Expo's own dev-server address.
// When you run `expo start` and scan the QR code, Expo Go connects to Metro
// at your machine's current LAN IP — that address is exposed at runtime via
// Constants.expoConfig.hostUri (e.g. "192.168.1.23:8081"). As long as the
// Spring Boot backend runs on the same machine as the Expo dev server (the
// normal setup for this project), reusing that host means the API URL is
// always correct for whatever network you're currently on — no manual IP
// editing, ever.
//
// EXPO_PUBLIC_API_BASE_URL in .env still wins if set, for cases where the
// backend runs somewhere other than your dev machine (a staging server, a
// teammate's machine, etc.) — but it should normally be left unset so this
// auto-detection can do its job.
function getDevServerHostAndPort(): { host: string; port: string } | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any)?.manifest?.debuggerHost ??
    null;
  if (!hostUri) return null;
  const [hostPart, portPart] = String(hostUri).split(':');
  const host = hostPart?.trim();
  if (!host) return null;
  return { host, port: portPart?.trim() || '8081' };
}

// FOUND 2026-07-22: routing REST calls straight to :8080 used to be correct,
// but on a physical device over Apple Personal Hotspot, port 8080 (Docker's
// api-gateway, behind the WSL2/Hyper-V network stack) turned out to be
// unreachable/unreliable, while Metro's own dev-server port is always
// reachable (the phone already uses it to load the JS bundle). Rather than
// keep fighting Windows Firewall/WSL2 NAT, metro.config.js now reverse-
// proxies /api/** and /internal/** through Metro's own port straight to the
// real backend on localhost:8080. So in dev, the API base URL should be
// Metro's host:port, not the backend's real port — the proxy handles the
// last hop. See metro.config.js for the proxy itself and its WS caveat
// (chat's WebSocket connection is NOT proxied yet and still targets :8080
// directly — see the `ws` field below and ChatClient.ts).
function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  const dev = getDevServerHostAndPort();
  if (dev) {
    return `http://${dev.host}:${dev.port}`;
  }
  // Last resort — only correct for a simulator/emulator running on this
  // same machine, not a physical device.
  return 'http://localhost:8080';
}

// The chat feature's WebSocket connection isn't proxied through Metro (see
// metro.config.js) — it still needs the backend's real address directly.
// Reuses the same dev-server host but forces the real backend port.
function resolveDirectBackendUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  const dev = getDevServerHostAndPort();
  if (dev) {
    return `http://${dev.host}:8080`;
  }
  return 'http://localhost:8080';
}

export const API_BASE_URL = resolveApiBaseUrl();

// Chat's WebSocket connection needs the backend's real address directly —
// it is NOT proxied through Metro (see metro.config.js and the comment on
// resolveDirectBackendUrl above). ChatClient.ts must build its ws:// URL
// from this, not from API.base, or it'll try to connect through Metro's
// port and fail.
export const DIRECT_BACKEND_URL = resolveDirectBackendUrl();

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
  admin: `${API_BASE_URL}/api/admin`,
  notifications: `${API_BASE_URL}/api/notifications`,
  payments: `${API_BASE_URL}/api/payments`,
  ws: `${DIRECT_BACKEND_URL}/ws`,
} as const;
