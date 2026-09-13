export type Surface = "shop" | "admin" | "both";

function hostname(): string {
  if (typeof window !== "undefined") return window.location.hostname.toLowerCase();
  const env = typeof process !== "undefined" ? process.env : undefined;
  const raw = env?.VERCEL_PROJECT_PRODUCTION_URL || env?.VERCEL_URL || "";
  return String(raw)
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
}

export function surface(): Surface {
  const fromEnv = import.meta.env.VITE_PAYNOTE_SURFACE as Surface | undefined;
  if (fromEnv === "shop" || fromEnv === "admin") return fromEnv;
  const host = hostname();
  if (!host) return "both";
  if (host.includes("desk") || host.includes("admin") || host.startsWith("staff.")) return "admin";
  if (host.includes("shop") || host.includes("market")) return "shop";
  return "both";
}

export function shopUrl() {
  const env = (import.meta.env.VITE_SHOP_URL as string | undefined)?.trim();
  if (env) return env;
  if (surface() === "admin") return "https://paynote-shop.vercel.app";
  return "/";
}

export function adminUrl() {
  const env = (import.meta.env.VITE_ADMIN_URL as string | undefined)?.trim();
  if (env) return env;
  if (surface() === "shop") return "https://paynote-desk.vercel.app";
  return "/admin";
}

export function isShopSurface() {
  return surface() === "shop";
}

export function isAdminSurface() {
  return surface() === "admin";
}
