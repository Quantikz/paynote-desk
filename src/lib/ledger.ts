import { createServerFn } from "@tanstack/react-start";
import type { Order, Product, Promo } from "@/lib/catalog";
import type { ShopProfile } from "@/lib/shop";

export const loadLedger = createServerFn({ method: "GET" }).handler(async () => {
  const { loadLedgerNow } = await import("@/lib/ledger.server");
  return loadLedgerNow();
});

export const saveLedger = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token?: string;
      products: Product[];
      promos: Promo[];
      shop: ShopProfile;
      orders: Order[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const { saveLedgerNow } = await import("@/lib/ledger.server");
    return saveLedgerNow(data);
  });

export const lanInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { lanInfoNow } = await import("@/lib/ledger.server");
  return lanInfoNow();
});

export const unlockStore = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const { unlockStoreNow } = await import("@/lib/ledger.server");
    return unlockStoreNow(data.password);
  });

export const setStorePassword = createServerFn({ method: "POST" })
  .validator((data: { token: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { setStorePasswordNow } = await import("@/lib/ledger.server");
    return setStorePasswordNow(data.token, data.password);
  });
