import { useEffect } from "react";
import { loadShelf, publishShelf } from "@/lib/market-server";
import { STAFF_PIN_KEY } from "@/components/staff-gate";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

const STORAGE_KEY = "paynote-ng-v1";

async function pullShelf() {
  const shelf = await loadShelf();
  if (shelf?.products?.length) {
    useMarket.getState().applyShelf(shelf.products, shelf.promos, shelf.version);
  }
}

function pushShelf() {
  if (typeof window === "undefined") return;
  if (surface() === "shop") return;
  const pin = sessionStorage.getItem(STAFF_PIN_KEY);
  if (!pin) return;
  const { products, promos } = useMarket.getState();
  void publishShelf({ data: { pin, products, promos } }).then((result) => {
    if (result.ok && result.version) {
      useMarket.setState({ shelfVersion: result.version });
    }
  });
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

    const poll = window.setInterval(() => {
      void pullShelf();
    }, 4000);

    let timer = 0;
    const unsub = useMarket.subscribe((state, prev) => {
      if (state.products === prev.products && state.promos === prev.promos) return;
      if (surface() === "shop") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => pushShelf(), 500);
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  return children;
}
