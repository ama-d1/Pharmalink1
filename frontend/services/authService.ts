import { API } from '@/constants/api';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { getAuthHeaders } from '@/utils/authHeaders';

// Reads API.auth at call time rather than freezing it in a module-level
// const — API's properties are getters now, so a server-URL change (or the
// startup hydration of a saved override) is picked up. See constants/api.ts.

// FIXED: every function below used to call plain fetch() with no timeout at
// all — unlike the rest of the app's service files, which already switched
// to fetchWithTimeout for exactly this reason (see that file's header
// comment). A plain fetch() to an unreachable host (wrong LAN IP, phone on a
// different WiFi than the backend, Expo started with --tunnel which breaks
// the auto-detected backend address, etc.) doesn't fail fast on iOS — it can
// hang for 15s to a couple of minutes with the promise never settling,
// which is exactly the "loads for long" symptom on the login/register
// screens. Racing against fetchWithTimeout's plain JS timer guarantees this
// throws a clear NETWORK_ERROR/TIMEOUT within 10s instead of hanging
// indefinitely with no feedback.

/**
 * Shape returned by every endpoint that can produce a session. Only one of
 * token / requiresVerification / requires2FA is ever meaningful at a time —
 * see the auth screens for how each is routed.
 */
export type AuthResult = {
  token?: string | null;
  userId?: string;
  fullName?: string | null;
  email?: string;
  role?: string;
  message?: string;
  requires2FA?: boolean;
  /** Account exists but was never confirmed — go collect the code. */
  requiresVerification?: boolean;
  /** Which channel the code actually went out on. Only set with the above. */
  verificationChannel?: VerificationChannel;
  /** Masked destination for display, e.g. "•••• 4567" or "j•••@gmail.com". */
  verificationTarget?: string;
};

/**
 * Sign-up codes are texted by default (the form just collected a phone
 * number). The server falls back to EMAIL on its own if SMS is unconfigured
 * or the send fails, which is why the response says which one was used rather
 * than the app assuming.
 */
export type VerificationChannel = 'SMS' | 'EMAIL';

/**
 * `identifier` is an email address OR a phone number (auth redesign,
 * 2026-08-04 — the login screen has a Phone Number / Email toggle now).
 * The server decides which lookup to run from the string's shape, not from
 * which tab was active, so typing an email under the Phone tab still works.
 *
 * Still sends `email` alongside `identifier`: admin-login and any older
 * build post that field, and the server accepts either.
 */
export const loginUser = async (identifier: string, password: string): Promise<AuthResult> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, email: identifier, password }),
    });
  } catch (error) {
    // fetch itself failed (or timed out) — no connection reached the server
    throw new Error("NETWORK_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    // server responded but didn't send valid JSON (e.g. a 500 HTML page)
    throw new Error("SERVER_ERROR");
  }
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  /** yyyy-MM-dd, or omitted — the server treats it as optional. */
  dateOfBirth?: string;
};

/**
 * Registration no longer returns a token (auth redesign): it returns
 * `requiresVerification: true` plus a userId, and the app must complete
 * /verify-email before a session exists.
 */
export const registerUser = async (payload: RegisterPayload): Promise<AuthResult> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // fullName is sent as well as the name parts: it's what
      // user-profile-service stores and what every "Hi, {name}" greeting in
      // the app reads.
      body: JSON.stringify({
        ...payload,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
      }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }
};

// ── Email verification at sign-up (auth redesign, 2026-08-04) ──────────────
// Called before any token exists — same unauthenticated posture as
// login/register, and listed in api-gateway's JwtAuthFilter open paths for
// that reason.

/** Confirms the emailed code and returns the token register() withheld. */
export const verifyEmailCode = async (userId: string, code: string): Promise<AuthResult> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }
};

/**
 * Backs both "Resend" and "Send to my email instead". The server answers
 * generically either way (it can't confirm an account exists to an
 * unauthenticated caller), so the screen reports the destination from the
 * channel it asked for rather than from the response.
 */
export const resendVerificationCode = async (
  userId: string,
  channel: VerificationChannel = 'SMS',
): Promise<void> => {
  try {
    await fetchWithTimeout(`${API.auth}/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, channel }),
    });
  } catch (error) {
    // Best-effort, same as resendTwoFactorCode below — a Resend button that
    // silently fails to network is still better than an error dialog on top
    // of a screen the user can retry from anyway.
  }
};

/**
 * Exchanges a Google ID token for a PharmaLink session. The token is
 * verified against Google server-side before anything in it is trusted —
 * see auth-service's GoogleTokenVerifier. Getting the ID token in the first
 * place is services/googleAuth.ts's job.
 */
export const googleSignIn = async (idToken: string): Promise<AuthResult> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }
};

export const forgotPassword = async (email: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new Error("SERVER_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }
};

export const resetPassword = async (token: string, password: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  let data: any;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }

  if (!response.ok) {
    throw new Error(data?.message || "RESET_FAILED");
  }

  return data;
};

// ── Two-factor authentication (coming-soon roadmap item #9) ────────────────
// verify/resend are called mid-login, before a token exists — same
// unauthenticated posture as loginUser/registerUser above (and why
// api-gateway's JwtAuthFilter open-path list explicitly allows these two).

export const verifyTwoFactorCode = async (userId: string, code: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API.auth}/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("SERVER_ERROR");
  }
};

export const resendTwoFactorCode = async (userId: string) => {
  try {
    await fetchWithTimeout(`${API.auth}/2fa/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    // Best-effort from the UI's perspective too — a "Resend code" button
    // that silently fails to network is still better than surfacing a raw
    // error mid-login. The screen just shows the button as tapped either way.
  }
};

// Authenticated — requires a real session (called from the Profile screen's
// Privacy & Security settings, after the user already logged in normally
// or via a completed 2FA challenge).

export const getTwoFactorStatus = async (): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${API.auth}/2fa`, { headers: await getAuthHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
};

export const setTwoFactorEnabled = async (enabled: boolean): Promise<boolean> => {
  const res = await fetchWithTimeout(`${API.auth}/2fa`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not update setting");
  return !!data.enabled;
};