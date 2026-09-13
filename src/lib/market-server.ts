import { createServerFn } from "@tanstack/react-start";
import { SEED_PRODUCTS, SEED_PROMOS, type Product, type Promo } from "@/lib/catalog";

export type ShelfPayload = {
  products: Product[];
  promos: Promo[];
  version: number;
};

type ShelfRow = {
  products: Product[] | string;
  promos: Promo[] | string;
  version: number;
};

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}

function fromRow(row: ShelfRow | undefined): ShelfPayload | null {
  if (!row) return null;
  return {
    products: parseJson(row.products, []),
    promos: parseJson(row.promos, []),
    version: Number(row.version) || 0,
  };
}

async function readShelf() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<ShelfRow>`
    select products, promos, version from market_shelf where id = 'live'
  `;
  return { sql, shelf: fromRow(rows[0]) };
}

async function writeShelf(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  products: Product[],
  promos: Promo[],
  version: number,
) {
  const productsJson = JSON.stringify(products);
  const promosJson = JSON.stringify(promos);
  await sql`
    insert into market_shelf (id, products, promos, version, updated_at)
    values ('live', ${productsJson}::jsonb, ${promosJson}::jsonb, ${version}, now())
    on conflict (id) do update set
      products = excluded.products,
      promos = excluded.promos,
      version = excluded.version,
      updated_at = now()
  `;
}

export const loadShelf = createServerFn({ method: "GET" }).handler(async (): Promise<ShelfPayload | null> => {
  try {
    const { shelf } = await readShelf();
    return shelf;
  } catch {
    return null;
  }
});

export const publishShelf = createServerFn({ method: "POST" })
  .validator((data: { token: string; products: Product[]; promos: Promo[] }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; version?: number; error?: string }> => {
    const { staffTokenValid } = await import("@/lib/staff-auth.server");
    if (!data?.token || !(await staffTokenValid(data.token))) {
      return { ok: false, error: "Staff session expired. Unlock the desk again." };
    }
    try {
      const { sql, shelf } = await readShelf();
      const version = (shelf?.version ?? 0) + 1;
      await writeShelf(sql, data.products, data.promos, version);
      return { ok: true, version };
    } catch {
      return { ok: false, error: "Could not save the shop list." };
    }
  });

export const reserveShelf = createServerFn({ method: "POST" })
  .validator((data: { items: Array<{ productId: string; qty: number }> }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; shelf?: ShelfPayload; error?: string }> => {
    const lines = (data.items ?? []).filter((item) => item.qty > 0 && item.productId);
    if (lines.length === 0) return { ok: false, error: "Nothing to hold." };
    try {
      const { sql, shelf } = await readShelf();
      const products = shelf?.products?.length ? shelf.products : SEED_PRODUCTS;
      const promos = shelf?.promos?.length ? shelf.promos : SEED_PROMOS;
      for (const line of lines) {
        const product = products.find((item) => item.id === line.productId);
        if (!product || !product.active) return { ok: false, error: "An item is no longer for sale." };
        if (product.stock < line.qty) {
          return { ok: false, error: `${product.name} only has ${product.stock} left.` };
        }
      }
      const nextProducts = products.map((product) => {
        const line = lines.find((item) => item.productId === product.id);
        if (!line) return product;
        return { ...product, stock: Math.max(0, product.stock - line.qty) };
      });
      const version = (shelf?.version ?? 0) + 1;
      await writeShelf(sql, nextProducts, promos, version);
      return { ok: true, shelf: { products: nextProducts, promos, version } };
    } catch {
      return { ok: false, error: "Could not hold stock on the live list." };
    }
  });
