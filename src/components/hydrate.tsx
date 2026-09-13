import { useEffect } from "react";
import { loadShelf, publishShelf, reserveShelf } from "@/lib/market-server";
import { staffToken } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

const STORAGE_KEY = "paynote-ng-v1";

export async function pullShelf() {
  const shelf = await loadShelf();
  if (shelf?.products?.length) {
    useMarket.getState().applyShelf(shelf.products, shelf.promos, shelf.version);
  }
  return shelf;
}

export async function pushShelf() {
  if (typeof window === "undefined") return { ok: false as const, error: "Offline" };
  if (surface() === "shop") return { ok: false as const, error: "Shop cannot publish." };
  const token = staffToken();
  if (!token) return { ok: false as const, error: "Unlock the desk first." };
  const { products, promos } = useMarket.getState();
  const result = await publishShelf({ data: { token, products, promos } });
  if (result.ok && result.version) {
    useMarket.setState({ shelfVersion: result.version });
  }
  return result;
}

export async function holdStock(items: Array<{ productId: string; qty: number }>) {
  const result = await reserveShelf({ data: { items } });
  if (result.ok && result.shelf) {
    useMarket.getState().applyShelf(result.shelf.products, result.shelf.promos, result.shelf.version);
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
      if (state.products === prev.products && state.promos === prev.promos) return;
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
