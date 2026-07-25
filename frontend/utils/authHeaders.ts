import AsyncStorage from '@react-native-async-storage/async-storage';

// Closes the single biggest gap flagged in BACKEND_TODO.md: api-gateway's
// JwtAuthFilter validates every request's `Authorization: Bearer <token>`
// header (401s if missing/invalid), but until now nothing in the frontend
// ever attached one — every gateway-protected route was 401ing against the
// real app. AuthContext.tsx already stores the token at AsyncStorage key
// '@pharmalink_session' (field `token`) after login; this just reads it
// back out and shapes it into a headers object every service call can spread
// into its existing `headers`.
//
// Deliberately NOT wired into fetchWithTimeout() globally — locationService's
// geocoding/reverse-geocoding calls may eventually hit third-party providers
// that shouldn't receive our internal JWT, so this stays an explicit,
// opt-in per-call addition rather than a blanket interceptor.
const STORAGE_KEY = '@pharmalink_session';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const session = JSON.parse(raw);
    if (!session?.token) return {};
    return { Authorization: `Bearer ${session.token}` };
  } catch {
    // Corrupt/unreadable session — treat as logged out rather than crash
    // the calling request; the gateway will 401 and the caller's existing
    // error handling takes it from there.
    return {};
  }
}

/** Convenience for call sites that just need the raw token string (e.g.
 *  STOMP connectHeaders, which wants `Authorization: Bearer X` shaped
 *  differently than a fetch headers object). Returns null if not logged in. */
export async function getAuthToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token ?? null;
  } catch {
    return null;
  }
}
