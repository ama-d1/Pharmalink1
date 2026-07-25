import { API } from '@/constants/api';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { getAuthHeaders } from '@/utils/authHeaders';

const BASE_URL = API.auth;

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

export const loginUser = async (email: string, password: string) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
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

export const registerUser = async (
  fullName: string,
  email: string,
  password: string,
  phoneNumber: string,
) => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, email, password, phoneNumber }),
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
    response = await fetchWithTimeout(`${BASE_URL}/forgot-password`, {
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
    response = await fetchWithTimeout(`${BASE_URL}/reset-password`, {
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
    response = await fetchWithTimeout(`${BASE_URL}/2fa/verify`, {
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
    await fetchWithTimeout(`${BASE_URL}/2fa/resend`, {
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
    const res = await fetchWithTimeout(`${BASE_URL}/2fa`, { headers: await getAuthHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
};

export const setTwoFactorEnabled = async (enabled: boolean): Promise<boolean> => {
  const res = await fetchWithTimeout(`${BASE_URL}/2fa`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not update setting");
  return !!data.enabled;
};