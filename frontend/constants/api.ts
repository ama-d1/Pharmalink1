import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Where the backend base URL comes from, in priority order:
//
//   1. A runtime override saved in AsyncStorage (app/server-settings.tsx).
//   2. EXPO_PUBLIC_API_BASE_URL, inlined at build time.
//   3. Auto-detection from Expo's dev-server address (dev builds only).
//   4. http://localhost:8080 — only ever correct on an emulator.
//
// FIXED 2026-08-04 — step 3 used to be the FIRST thing tried, and steps 1/2
// did not exist in any usable form. That works in Expo Go / a dev build,
// where Constants.expoConfig.hostUri holds the Metro dev-server address
// (e.g. "192.168.1.23:8081") and the backend runs on the same machine. But
// in a standalone EAS build (preview/production) there is NO Metro dev
// server, so hostUri is null and resolution fell all the way through to
// http://localhost:8080 — which, on a phone, means the phone itself. Every
// request then failed with "Could not reach the server" on the auth screen.
// That is the entire reason preview builds could not log in.
//
// Note that EXPO_PUBLIC_API_BASE_URL cannot be supplied via frontend/.env
// for an EAS build: the repo root .gitignore has `**/.env`, and EAS only
// uploads git-tracked files, so the variable would simply be undefined in
// the build. It has to come from eas.json's `build.<profile>.env` (or an
// EAS environment variable). See eas.json.
//
// The AsyncStorage override at step 1 exists so the address is not frozen
// into the binary. A Cloudflare quick-tunnel URL changes every time the
// tunnel restarts, and a LAN IP changes with DHCP — without an override,
// each change would need a fresh ~15-minute EAS build. Now it's a paste
// into the in-app Server Settings screen.

const OVERRIDE_STORAGE_KEY = '@pharmalink_api_base_url';

// Read synchronously by resolveApiBaseUrl(). Hydrated once at startup by
// loadApiBaseUrlOverride() before the app renders anything that can make a
// request — see app/_layout.tsx. Kept as a plain module-level variable
// (rather than context) because non-React code (services/*, ChatClient)
// needs the resolved URL too.
let overrideBaseUrl: string | null = null;

/**
 * Accepts what a human would actually type — "192.168.1.5:8080",
 * "example.trycloudflare.com", "https://host/" — and returns a URL the
 * fetch/WebSocket layers can use. Assumes http:// when no scheme is given,
 * since a bare host is nearly always a LAN address in this project.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

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

function envBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  return raw ? normalizeBaseUrl(raw) : null;
}

// Routing REST calls at Metro's own port rather than the backend's :8080 is
// deliberate in dev: metro.config.js reverse-proxies /api/** and /internal/**
// through to localhost:8080, which sidesteps the WSL2/Docker/Windows-Firewall
// unreachability of :8080 from a physical device. That proxy is a dev-server
// feature and does NOT exist in a standalone build — which is why steps 1 and
// 2 above must point at the backend (or a tunnel to it) directly.
export function getApiBaseUrl(): string {
  if (overrideBaseUrl) return overrideBaseUrl;
  const fromEnv = envBaseUrl();
  if (fromEnv) return fromEnv;
  const dev = getDevServerHostAndPort();
  if (dev) return `http://${dev.host}:${dev.port}`;
  return 'http://localhost:8080';
}

/**
 * The backend's real address, bypassing Metro's proxy. Only differs from
 * getApiBaseUrl() in the dev-server case, where the proxy does not cover
 * WebSocket upgrades (see metro.config.js) so chat must reach :8080 itself.
 * With an override or a build-time URL there is no proxy in play and the
 * two are identical.
 */
export function getDirectBackendUrl(): string {
  if (overrideBaseUrl) return overrideBaseUrl;
  const fromEnv = envBaseUrl();
  if (fromEnv) return fromEnv;
  const dev = getDevServerHostAndPort();
  if (dev) return `http://${dev.host}:8080`;
  return 'http://localhost:8080';
}

/** Whether the URL in use came from the in-app override rather than the build. */
export function hasApiBaseUrlOverride(): boolean {
  return overrideBaseUrl !== null;
}

/** The build-time default, shown in Server Settings as the "Reset" target. */
export function getDefaultApiBaseUrl(): string {
  const fromEnv = envBaseUrl();
  if (fromEnv) return fromEnv;
  const dev = getDevServerHostAndPort();
  if (dev) return `http://${dev.host}:${dev.port}`;
  return 'http://localhost:8080';
}

/**
 * Hydrates the saved override. MUST be awaited before the first API call —
 * app/_layout.tsx blocks rendering on it. Resolution is synchronous
 * everywhere else precisely because of this one-time async warm-up.
 */
export async function loadApiBaseUrlOverride(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(OVERRIDE_STORAGE_KEY);
    overrideBaseUrl = saved ? normalizeBaseUrl(saved) || null : null;
  } catch {
    // A storage failure must not prevent the app from booting — fall back to
    // the build-time URL, which is the correct address in the normal case.
    overrideBaseUrl = null;
  }
}

/** Persists an override (or clears it when passed null/empty). */
export async function setApiBaseUrlOverride(raw: string | null): Promise<void> {
  const normalized = raw ? normalizeBaseUrl(raw) : '';
  if (!normalized) {
    overrideBaseUrl = null;
    await AsyncStorage.removeItem(OVERRIDE_STORAGE_KEY);
    return;
  }
  overrideBaseUrl = normalized;
  await AsyncStorage.setItem(OVERRIDE_STORAGE_KEY, normalized);
}

// Getters, not a frozen snapshot.
//
// This object used to be built from `const API_BASE_URL = resolveApiBaseUrl()`
// evaluated once at module load. With a runtime override that is wrong: the
// override is hydrated from AsyncStorage after module evaluation, and can be
// changed again from Server Settings without a restart. Each property
// re-resolves on read so both cases are picked up. Callers must therefore
// read `API.auth` at call time — capturing it in a module-level const
// reintroduces exactly the staleness this replaces.
export const API = {
  get base() { return getApiBaseUrl(); },
  get auth() { return `${getApiBaseUrl()}/api/auth`; },
  get medications() { return `${getApiBaseUrl()}/api/medications`; },
  get drugSearch() { return `${getApiBaseUrl()}/api/drugs`; },
  get chat() { return `${getApiBaseUrl()}/api/chat`; },
  get home() { return `${getApiBaseUrl()}/api/home`; },
  get pharmacies() { return `${getApiBaseUrl()}/api/pharmacies`; },
  get orders() { return `${getApiBaseUrl()}/api/orders`; },
  get community() { return `${getApiBaseUrl()}/api/community`; },
  get profile() { return `${getApiBaseUrl()}/api/profile`; },
  get delivery() { return `${getApiBaseUrl()}/api/delivery`; },
  get admin() { return `${getApiBaseUrl()}/api/admin`; },
  get notifications() { return `${getApiBaseUrl()}/api/notifications`; },
  get payments() { return `${getApiBaseUrl()}/api/payments`; },
  // http -> ws and https -> wss (the regex anchors "http", leaving any "s").
  get ws() { return `${getDirectBackendUrl().replace(/^http/, 'ws')}/ws`; },
} as const;
