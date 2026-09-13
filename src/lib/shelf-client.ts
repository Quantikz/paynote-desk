import { adminUrl, surface } from "@/lib/surface";
import type { ShopProfile } from "@/lib/shop";
import type { Product, Promo } from "@/lib/catalog";

export type RemoteShelf = {
  products: Product[];
  promos: Promo[];
  shop?: ShopProfile;
  version: number;
};

export function shelfOrigin() {
  const env = (import.meta.env.VITE_SHELF_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  const remote = surface() === "shop" ? adminUrl() : surface() === "admin" ? "" : "";
  if (!remote.startsWith("http")) return "";
  try {
    const origin = new URL(remote).origin;
    if (origin === window.location.origin) return "";
    return origin;
  } catch {
    return "";
  }
}

export async function fetchRemoteShelf(origin: string): Promise<RemoteShelf | null> {
  const response = await fetch(`${origin}/api/shelf`, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as RemoteShelf;
  if (!payload?.products?.length) return null;
  return payload;
}

export async function reserveRemoteShelf(
  origin: string,
  items: Array<{ productId: string; qty: number }>,
): Promise<{ ok: boolean; shelf?: RemoteShelf; error?: string }> {
  const response = await fetch(`${origin}/api/shelf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; shelf?: RemoteShelf; error?: string }
    | null;
  if (!response.ok || !payload?.ok) {
    return { ok: false, error: payload?.error ?? "Could not hold stock on the live list." };
  }
  return { ok: true, shelf: payload.shelf };
}

export async function publishRemoteShelf(
  origin: string,
  input: { token: string; products: Product[]; promos: Promo[]; shop: ShopProfile },
): Promise<{ ok: boolean; version?: number; error?: string }> {
  const response = await fetch(`${origin}/api/shelf`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; version?: number; error?: string }
    | null;
  if (!response.ok || !payload?.ok) {
    return { ok: false, error: payload?.error ?? "Could not save the shop list." };
  }
  return { ok: true, version: payload.version };
}
