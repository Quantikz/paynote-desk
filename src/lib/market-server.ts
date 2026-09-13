import { createServerFn } from "@tanstack/react-start";
import { SEED_PRODUCTS, SEED_PROMOS, type Product, type Promo } from "@/lib/catalog";
import { DEFAULT_SHOP, normalizeShop, type ShopProfile } from "@/lib/shop";

export type ShelfPayload = {
  products: Product[];
  promos: Promo[];
  shop: ShopProfile;
  version: number;
};

type ShelfRow = {
  products: Product[] | string;
  promos: Promo[] | string;
  shop?: ShopProfile | string;
  version: number;
};

function parseJson<T>(value: T | string | undefined, fallback: T): T {
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
    shop: normalizeShop(parseJson(row.shop, DEFAULT_SHOP)),
    version: Number(row.version) || 0,
  };
}

async function readShelf() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  try {
    const rows = await sql<ShelfRow>`
      select products, promos, shop, version from market_shelf where id = 'live'
    `;
    return { sql, shelf: fromRow(rows[0]) };
  } catch {
    const rows = await sql<ShelfRow>`
      select products, promos, version from market_shelf where id = 'live'
    `;
    return { sql, shelf: fromRow(rows[0]) };
  }
}

async function writeShelf(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  products: Product[],
  promos: Promo[],
  shop: ShopProfile,
  version: number,
) {
  const productsJson = JSON.stringify(products);
  const promosJson = JSON.stringify(promos);
  const shopJson = JSON.stringify(normalizeShop(shop));
  await sql`
    insert into market_shelf (id, products, promos, shop, version, updated_at)
    values ('live', ${productsJson}::jsonb, ${promosJson}::jsonb, ${shopJson}::jsonb, ${version}, now())
    on conflict (id) do update set
      products = excluded.products,
      promos = excluded.promos,
      shop = excluded.shop,
      version = excluded.version,
      updated_at = now()
  `;
}

export async function shelfSnapshot(): Promise<ShelfPayload | null> {
  try {
    const { shelf } = await readShelf();
    return shelf;
  } catch {
    return null;
  }
}

export async function publishLiveShelf(input: {
  products: Product[];
  promos: Promo[];
  shop?: ShopProfile;
}): Promise<{ ok: boolean; version?: number; error?: string }> {
  try {
    const { sql, shelf } = await readShelf();
    const version = (shelf?.version ?? 0) + 1;
    const shop = normalizeShop(input.shop ?? shelf?.shop ?? DEFAULT_SHOP);
    await writeShelf(sql, input.products, input.promos, shop, version);
    return { ok: true, version };
  } catch {
    return { ok: false, error: "Could not save the shop list." };
  }
}

export async function reserveLiveShelf(
  items: Array<{ productId: string; qty: number }>,
): Promise<{ ok: boolean; shelf?: ShelfPayload; error?: string }> {
  const lines = items.filter((item) => item.qty > 0 && item.productId);
  if (lines.length === 0) return { ok: false, error: "Nothing to hold." };
  try {
    const { sql, shelf } = await readShelf();
    const products = shelf?.products?.length ? shelf.products : SEED_PRODUCTS;
    const promos = shelf?.promos?.length ? shelf.promos : SEED_PROMOS;
    const shop = normalizeShop(shelf?.shop ?? DEFAULT_SHOP);
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
    await writeShelf(sql, nextProducts, promos, shop, version);
    return { ok: true, shelf: { products: nextProducts, promos, shop, version } };
  } catch {
    return { ok: false, error: "Could not hold stock on the live list." };
  }
}

export const loadShelf = createServerFn({ method: "GET" }).handler(async (): Promise<ShelfPayload | null> => {
  return shelfSnapshot();
});

export const publishShelf = createServerFn({ method: "POST" })
  .validator((data: { token: string; products: Product[]; promos: Promo[]; shop?: ShopProfile }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; version?: number; error?: string }> => {
    const { staffTokenValid } = await import("@/lib/staff-auth.server");
    if (!data?.token || !(await staffTokenValid(data.token))) {
      return { ok: false, error: "Staff session expired. Unlock the desk again." };
    }
    return publishLiveShelf({ products: data.products, promos: data.promos, shop: data.shop });
  });

export const reserveShelf = createServerFn({ method: "POST" })
  .validator((data: { items: Array<{ productId: string; qty: number }> }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; shelf?: ShelfPayload; error?: string }> => {
    return reserveLiveShelf(data.items ?? []);
  });
