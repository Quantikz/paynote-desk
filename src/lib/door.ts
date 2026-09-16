const KEY = "paynote-door";

export function storeUnlocked() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(KEY) === "ok" || window.localStorage.getItem(KEY) === "ok";
}

export function rememberStore(keep: boolean) {
  sessionStorage.setItem(KEY, "ok");
  if (keep) localStorage.setItem(KEY, "ok");
  else localStorage.removeItem(KEY);
}

export function lockStore() {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
