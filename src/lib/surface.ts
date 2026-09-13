export type Surface = "shop" | "admin" | "both";

export function surface(): Surface {
  const fromEnv = import.meta.env.VITE_PAYNOTE_SURFACE as Surface | undefined;
  if (fromEnv === "shop" || fromEnv === "admin") return fromEnv;
  if (typeof window === "undefined") return "both";
  const host = window.location.hostname.toLowerCase();
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
