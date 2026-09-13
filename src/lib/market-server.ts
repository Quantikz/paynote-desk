import { createServerFn } from "@tanstack/react-start";
import type { Product, Promo } from "@/lib/catalog";

export type ShelfPayload = {
  products: Product[];
  promos: Promo[];
  version: number;
};

export const loadShelf = createServerFn({ method: "GET" }).handler(async (): Promise<ShelfPayload | null> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ products: Product[]; promos: Promo[]; version: number }>`
      select products, promos, version from market_shelf where id = 'live'
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
});

export const publishShelf = createServerFn({ method: "POST" })
  .validator((data: { pin: string; products: Product[]; promos: Promo[] }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; version?: number; error?: string }> => {
    const pin = process.env.STAFF_PIN || "1234";
    if (!data?.pin || data.pin !== pin) {
      return { ok: false, error: "Staff PIN was rejected." };
    }
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const current = await sql<{ version: number }>`
        select version from market_shelf where id = 'live'
      `;
      const version = (current[0]?.version ?? 0) + 1;
      const productsJson = JSON.stringify(data.products);
      const promosJson = JSON.stringify(data.promos);
      await sql`
        insert into market_shelf (id, products, promos, version, updated_at)
        values ('live', ${productsJson}::jsonb, ${promosJson}::jsonb, ${version}, now())
        on conflict (id) do update set
          products = excluded.products,
          promos = excluded.promos,
          version = excluded.version,
          updated_at = now()
      `;
      return { ok: true, version };
    } catch {
      return { ok: false, error: "Could not save the shop list." };
    }
  });
