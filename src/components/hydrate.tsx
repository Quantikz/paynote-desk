import { useEffect } from "react";
import { loadShelf, publishShelf, reserveShelf, type ShelfPayload } from "@/lib/market-server";
import { fetchRemoteShelf, publishRemoteShelf, reserveRemoteShelf, shelfOrigin } from "@/lib/shelf-client";
import { staffToken } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

const STORAGE_KEY = "paynote-ng-v1";

function applyLive(shelf: ShelfPayload | { products: ShelfPayload["products"]; promos: ShelfPayload["promos"]; version: number; shop?: ShelfPayload["shop"] } | null) {
  if (!shelf?.products?.length) return;
  useMarket.getState().applyShelf(shelf.products, shelf.promos, shelf.version, shelf.shop);
}

export async function pullShelf() {
  const local = await loadShelf();
  if (local?.version) {
    applyLive(local);
    return local;
  }
  const origin = shelfOrigin();
  if (origin) {
    try {
      const remote = await fetchRemoteShelf(origin);
      applyLive(remote);
      return remote;
    } catch {
      return local;
    }
  }
  applyLive(local);
  return local;
}

export async function pushShelf() {
  if (typeof window === "undefined") return { ok: false as const, error: "Offline" };
  if (surface() === "shop") return { ok: false as const, error: "Shop cannot publish." };
  const token = staffToken();
  if (!token) return { ok: false as const, error: "Unlock the desk first." };
  const { products, promos, shop } = useMarket.getState();
  const origin = shelfOrigin();
  const result = origin
    ? await publishRemoteShelf(origin, { token, products, promos, shop })
    : await publishShelf({ data: { token, products, promos, shop } });
  if (result.ok && result.version) {
    useMarket.setState({ shelfVersion: result.version });
  }
  return result;
}

export async function holdStock(items: Array<{ productId: string; qty: number }>) {
  const origin = shelfOrigin();
  const result = origin
    ? await reserveRemoteShelf(origin, items)
    : await reserveShelf({ data: { items } });
  if (result.ok && result.shelf) {
    applyLive(result.shelf);
  }
  return result;
}

export function HydrateGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void Promise.resolve(useMarket.persist.rehydrate()).then(() => {
      useMarket.getState().pruneCart();
      useMarket.getState().setHydrated(true);
      void pullShelf();
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        void Promise.resolve(useMarket.persist.rehydrate()).then(() => {
          useMarket.getState().pruneCart();
        });
      }
    };
    window.addEventListener("storage", onStorage);

    const onFocus = () => {
      void pullShelf();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const poll = window.setInterval(() => {
      void pullShelf();
    }, 3000);

    let timer = 0;
    const unsub = useMarket.subscribe((state, prev) => {
      if (
        state.products === prev.products &&
        state.promos === prev.promos &&
        state.shop === prev.shop
      ) {
        return;
      }
      if (surface() === "shop") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void pushShelf();
      }, 400);
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(poll);
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  return children;
}
