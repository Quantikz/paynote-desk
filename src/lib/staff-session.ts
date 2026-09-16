export const STAFF_KEY = "paynote-staff";
export const STAFF_TOKEN_KEY = "paynote-staff-token";
export const STAFF_UNTIL_KEY = "paynote-staff-until";
const PIN_HASH_KEY = "paynote-staff-pin-hash";
const SESSION_MS = 30 * 60 * 1000;

export function staffUnlocked() {
  if (typeof window === "undefined") return false;
  const until = Number(sessionStorage.getItem(STAFF_UNTIL_KEY) ?? 0);
  const token = sessionStorage.getItem(STAFF_TOKEN_KEY);
  if (!until || Date.now() > until || !token) {
    clearStaffSession();
    return false;
  }
  return sessionStorage.getItem(STAFF_KEY) === "1";
}

export function staffToken() {
  if (typeof window === "undefined") return "";
  if (!staffUnlocked()) return "";
  return sessionStorage.getItem(STAFF_TOKEN_KEY) ?? "";
}

export function isLocalStaffToken(token = staffToken()) {
  return token.startsWith("offline-");
}

export function saveStaffSession(token: string, expiresAt: number) {
  sessionStorage.setItem(STAFF_KEY, "1");
  sessionStorage.setItem(STAFF_TOKEN_KEY, token);
  sessionStorage.setItem(STAFF_UNTIL_KEY, String(expiresAt));
}

export function saveLocalStaffSession() {
  saveStaffSession(`offline-${crypto.randomUUID()}`, Date.now() + SESSION_MS);
}

export function clearStaffSession() {
  sessionStorage.removeItem(STAFF_KEY);
  sessionStorage.removeItem(STAFF_TOKEN_KEY);
  sessionStorage.removeItem(STAFF_UNTIL_KEY);
  sessionStorage.removeItem("paynote-staff-pin");
}

export function staffMsLeft() {
  if (typeof window === "undefined") return 0;
  return Math.max(0, Number(sessionStorage.getItem(STAFF_UNTIL_KEY) ?? 0) - Date.now());
}

async function digestPin(pin: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`paynote-desk:${pin}`),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function rememberStaffPin(pin: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_HASH_KEY, await digestPin(pin));
}

export async function localPinMatches(pin: string) {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  return stored === (await digestPin(pin));
}

export function hasLocalStaffPin() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PIN_HASH_KEY));
}
