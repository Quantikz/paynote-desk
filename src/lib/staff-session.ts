export const STAFF_KEY = "paynote-staff";
export const STAFF_TOKEN_KEY = "paynote-staff-token";
export const STAFF_UNTIL_KEY = "paynote-staff-until";

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

export function saveStaffSession(token: string, expiresAt: number) {
  sessionStorage.setItem(STAFF_KEY, "1");
  sessionStorage.setItem(STAFF_TOKEN_KEY, token);
  sessionStorage.setItem(STAFF_UNTIL_KEY, String(expiresAt));
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
