import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

// Added 2026-07-24 for real Paystack payment splitting — backs the OWNER-only
// payout-settings screen (frontend/app/(pharmacist)/payout-settings.tsx).
// See pharmacy-service's PayoutController (backend) for the full feature
// context: linking a bank account here creates a real Paystack subaccount,
// which is what actually splits a payment 90% pharmacy / 10% platform at
// checkout.
//
// throwIfNotOk matches profileService.ts's just-fixed convention — reads the
// backend's real error message out of a failed response body instead of a
// generic "something went wrong", since fetch() never rejects on 4xx/5xx.
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

export type Bank = {
  name: string;
  code: string;
};

export type BankAccountStatus = {
  bankCode?: string | null;
  bankAccountName?: string | null;
  subaccountActive: boolean;
  lastFourDigits?: string | null;
};

export async function listBanks(): Promise<Bank[]> {
  const res = await fetch(`${API.pharmacies}/banks`, { headers: await getAuthHeaders() });
  await throwIfNotOk(res, `Could not load bank list (${res.status})`);
  return res.json();
}

export async function resolveAccount(pharmacyId: string, accountNumber: string, bankCode: string): Promise<string> {
  const res = await fetch(`${API.pharmacies}/${pharmacyId}/resolve-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ accountNumber, bankCode }),
  });
  await throwIfNotOk(res, `Could not verify account (${res.status})`);
  const data = await res.json();
  return data.accountName as string;
}

export async function saveBankAccount(
  pharmacyId: string,
  accountNumber: string,
  bankCode: string,
  accountName: string
): Promise<BankAccountStatus> {
  const res = await fetch(`${API.pharmacies}/${pharmacyId}/bank-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ accountNumber, bankCode, accountName }),
  });
  await throwIfNotOk(res, `Could not save bank account (${res.status})`);
  return res.json();
}

export async function getBankAccountStatus(pharmacyId: string): Promise<BankAccountStatus> {
  const res = await fetch(`${API.pharmacies}/${pharmacyId}/bank-account`, { headers: await getAuthHeaders() });
  await throwIfNotOk(res, `Could not load payout status (${res.status})`);
  return res.json();
}
