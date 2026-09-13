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
  return import.meta.env.VITE_SHOP_URL || (surface() === "admin" ? "https://paynote-shop.vercel.app" : "/");
}

export function adminUrl() {
  return import.meta.env.VITE_ADMIN_URL || (surface() === "shop" ? "https://paynote-desk.vercel.app" : "/admin");
}
