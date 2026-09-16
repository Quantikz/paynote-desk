import { useEffect } from "react";
import { loadLedger, saveLedger } from "@/lib/ledger";
import { staffToken } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

let applying = false;

function applyLive(
  ledger: Awaited<ReturnType<typeof loadLedger>> | null,
) {
  if (!ledger?.products?.length) return;
  applying = true;
  if (surface() === "shop") {
    useMarket.getState().applyShelf(
      ledger.products,
      ledger.promos,
      ledger.version,
      ledger.shop,
    );
  } else {
    useMarket.getState().applyLedger(
      ledger.products,
      ledger.promos,
      ledger.orders,
      ledger.version,
      ledger.shop,
    );
  }
  applying = false;
}

export async function pullShelf() {
  try {
    const ledger = await loadLedger();
    applyLive(ledger);
    return ledger;
  } catch {
    return null;
  }
}

export async function pushShelf() {
  if (typeof window === "undefined") return { ok: false as const, error: "Not ready" };
  const { products, promos, shop, orders } = useMarket.getState();
  try {
    const result = await saveLedger({
      data: { token: staffToken() || "offline-local", products, promos, shop, orders },
    });
    if (result.ok && result.version) {
      useMarket.setState({ shelfVersion: result.version });
    }
    return result;
  } catch {
    return { ok: false as const, error: "Could not save on this computer." };
  }
}

export async function holdStock(items: Array<{ productId: string; qty: number }>) {
  try {
    const { reserveShelf } = await import("@/lib/market-server");
    const result = await reserveShelf({ data: { items } });
    if (result.ok) void pullShelf();
    return result;
  } catch {
    return { ok: false as const, error: "Could not hold stock." };
  }
}

export function HydrateGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void Promise.resolve(useMarket.persist.rehydrate()).then(async () => {
      useMarket.getState().pruneCart();
      await pullShelf();
      useMarket.getState().setHydrated(true);
    });

    const onFocus = () => {
      void pullShelf();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const poll = window.setInterval(() => {
      void pullShelf();
    }, 4000);

    let timer = 0;
    const unsub = useMarket.subscribe((state, prev) => {
      if (applying) return;
      if (surface() === "shop") return;
      if (
        state.products === prev.products &&
        state.promos === prev.promos &&
        state.shop === prev.shop &&
        state.orders === prev.orders
      ) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void pushShelf();
      }, 350);
    });

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(poll);
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  return children;
}
