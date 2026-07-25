export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Popular consumer email providers accepted at sign-up. This is a frontend-only
// gate right now — the backend's RegisterRequest only checks @Email format, so
// this can be bypassed by calling the API directly. If this restriction matters
// for real (not just UX), it needs a matching check server-side too.
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
];

// Validates format + provider. Used at account-creation time (Register).
// Not applied at Login — an existing account shouldn't be locked out if the
// allowed-domain list changes after they signed up.
export function getEmailError(email: string): string {
  if (!email) return 'Email is required.';
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.';

  const domain = email.split('@')[1]?.toLowerCase();
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return 'Please use an email from a supported provider (Gmail, Yahoo, Outlook, iCloud, etc.).';
  }
  return '';
}

const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

// Standard password policy applied anywhere a new password is created
// (Register, Reset Password). Login only checks that a password was entered —
// it's validating an existing password, not creating one.
export function getPasswordError(password: string): string {
  if (!password) return 'Password is required.';

  const missing: string[] = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!HAS_UPPERCASE.test(password)) missing.push('an uppercase letter');
  if (!HAS_LOWERCASE.test(password)) missing.push('a lowercase letter');
  if (!HAS_NUMBER.test(password)) missing.push('a number');
  if (!HAS_SPECIAL.test(password)) missing.push('a special character');

  if (missing.length === 0) return '';
  return `Password needs ${missing.join(', ')}.`;
}

// ── Payment form validation ─────────────────────────────────────────────────
// Note: there's no real payment gateway behind this yet (see BACKEND_TODO.md),
// but the form should still reject obviously-wrong input rather than accepting
// anything non-empty.

export function getPhoneNumberError(phone: string, label = 'Phone number'): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return `${label} is required.`;
  if (digits.length < 9 || digits.length > 12) return `Enter a valid ${label.toLowerCase()}.`;
  return '';
}

export function getMomoNumberError(phone: string): string {
  return getPhoneNumberError(phone, 'Mobile money number');
}

export function getCardNumberError(cardNumber: string): string {
  const digits = cardNumber.replace(/\s/g, '');
  if (!digits) return 'Card number is required.';
  if (!/^\d{13,19}$/.test(digits)) return 'Enter a valid card number.';
  return '';
}

export function getExpiryDateError(expiry: string): string {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return 'Enter expiry as MM/YY.';
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return 'Enter a valid month.';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'This card has expired.';
  }
  return '';
}

export function getCvvError(cvv: string): string {
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter a valid CVV.';
  return '';
}

export function getCardNameError(name: string): string {
  if (!name.trim()) return 'Cardholder name is required.';
  return '';
}
