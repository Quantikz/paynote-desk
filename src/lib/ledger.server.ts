import { createHash, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import {
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PROMOS,
  isRecordedSale,
  type Order,
  type Product,
  type Promo,
} from "@/lib/catalog";
import { DEFAULT_SHOP, normalizeShop, type ShopProfile } from "@/lib/shop";

export type LedgerPayload = {
  products: Product[];
  promos: Promo[];
  shop: ShopProfile;
  orders: Order[];
  version: number;
  dataDir: string;
  lanUrls: string[];
};

function doorDigest(pin: string) {
  return createHash("sha256").update(`paynote-door:${pin}`).digest();
}

function defaultDoor() {
  return (process.env.PAYNOTE_PASSWORD ?? "1234").trim();
}

function listenPort() {
  const raw = Number(process.env.PORT || process.env.PAYNOTE_PORT || 8080);
  return Number.isFinite(raw) && raw > 0 ? raw : 8080;
}

function isLocalProcess() {
  return process.env.PAYNOTE_LOCAL === "1";
}

function isLanV4(net: { family?: string | number; internal?: boolean; address: string }) {
  if (net.internal) return false;
  const family = String(net.family);
  if (family !== "IPv4" && family !== "4") return false;
  if (net.address.startsWith("169.254.")) return false;
  return true;
}

export function lanUrls() {
  if (!isLocalProcess()) return [];
  const port = listenPort();
  const urls: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (!isLanV4(net)) continue;
      urls.push(`http://${net.address}:${port}`);
    }
  }
  urls.sort((a, b) => Number(b.includes("192.168.")) - Number(a.includes("192.168.")));
  return urls;
}

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

function withCost(product: Product): Product {
  if (typeof product.costCents === "number" && Number.isFinite(product.costCents)) {
    return product;
  }
  return { ...product, costCents: Math.round((product.priceCents || 0) * 0.65) };
}

export function orderCogs(order: Order) {
  return order.items.reduce((n, item) => n + (item.costCents ?? 0) * item.qty, 0);
}

export function orderProfit(order: Order) {
  return order.subtotalCents - order.discountCents - orderCogs(order);
}

function canWrite(token?: string) {
  if (!token) return false;
  if (token.startsWith("offline-")) return true;
  return true;
}

type ShelfRow = {
  products: Product[] | string;
  promos: Promo[] | string;
  shop?: ShopProfile | string;
  version: number;
};

async function sqlClient() {
  const { getSql, dataDir, dbSource } = await import("@/lib/db");
  return { sql: await getSql(), dataDir: dataDir(), dbSource };
}

async function readShelf(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>) {
  try {
    const rows = await sql<ShelfRow>`
      select products, promos, shop, version from market_shelf where id = 'live'
    `;
    const row = rows[0];
    if (!row) return null;
    const products = parseJson(row.products, [] as Product[]).map(withCost);
    if (!products.length) return null;
    return {
      products,
      promos: parseJson(row.promos, [] as Promo[]),
      shop: normalizeShop(parseJson(row.shop, DEFAULT_SHOP)),
      version: Number(row.version) || 0,
    };
  } catch {
    return null;
  }
}

async function writeShelf(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  products: Product[],
  promos: Promo[],
  shop: ShopProfile,
  version: number,
) {
  const productsJson = JSON.stringify(products.map(withCost));
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

async function readOrders(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  products: Product[],
): Promise<Order[]> {
  try {
    const rows = await sql<{ payload: Order | string }>`
      select payload from store_orders order by created_at desc
    `;
    return rows
      .map((row) => parseJson(row.payload, null as Order | null))
      .filter((order): order is Order => Boolean(order?.id))
      .map((order) => withItemCost(order, products));
  } catch {
    return [];
  }
}

function withItemCost(order: Order, products: Product[]): Order {
  return {
    ...order,
    items: order.items.map((item) => {
      if (typeof item.costCents === "number" && Number.isFinite(item.costCents)) return item;
      const product = products.find((row) => row.id === item.productId);
      return {
        ...item,
        costCents: product?.costCents ?? Math.round((item.priceCents || 0) * 0.65),
      };
    }),
  };
}

async function writeOrders(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>, orders: Order[]) {
  for (const order of orders) {
    const cost = orderCogs(order);
    const profit = orderProfit(order);
    const payload = JSON.stringify(order);
    await sql`
      insert into store_orders (
        id, number, created_at, walk_in, status, total_cents, cost_cents, profit_cents, payload
      )
      values (
        ${order.id},
        ${order.number},
        ${order.createdAt},
        ${Boolean(order.walkIn)},
        ${order.status},
        ${order.totalCents},
        ${cost},
        ${profit},
        ${payload}::jsonb
      )
      on conflict (id) do update set
        number = excluded.number,
        created_at = excluded.created_at,
        walk_in = excluded.walk_in,
        status = excluded.status,
        total_cents = excluded.total_cents,
        cost_cents = excluded.cost_cents,
        profit_cents = excluded.profit_cents,
        payload = excluded.payload
    `;
  }
}

async function seedIfEmpty(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>) {
  const shelf = await readShelf(sql);
  if (shelf) return shelf;
  const seeded = {
    products: SEED_PRODUCTS.map(withCost),
    promos: SEED_PROMOS,
    shop: DEFAULT_SHOP,
    version: 1,
  };
  await writeShelf(sql, seeded.products, seeded.promos, seeded.shop, seeded.version);
  return seeded;
}

export async function loadLedgerNow(): Promise<LedgerPayload> {
  const { sql, dataDir, dbSource } = await sqlClient();
  const shelf = await seedIfEmpty(sql);
  let orders = await readOrders(sql, shelf.products);
  if (!orders.length && SEED_ORDERS.length && dbSource !== "neon") {
    orders = SEED_ORDERS.map((order) => withItemCost(order, shelf.products));
    await writeOrders(sql, orders);
  }
  return {
    ...shelf,
    orders,
    dataDir,
    lanUrls: lanUrls(),
  };
}

export async function saveLedgerNow(input: {
  products: Product[];
  promos: Promo[];
  shop: ShopProfile;
  orders: Order[];
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  try {
    const { sql } = await sqlClient();
    const current = await readShelf(sql);
    const version = (current?.version ?? 0) + 1;
    await writeShelf(
      sql,
      input.products.map(withCost),
      input.promos,
      normalizeShop(input.shop),
      version,
    );
    await writeOrders(sql, input.orders.filter(isRecordedSale));
    return { ok: true, version };
  } catch {
    return { ok: false, error: "Could not save the shop book on this computer." };
  }
}

export async function lanInfoNow() {
  const { dataDir } = await sqlClient();
  const local = isLocalProcess();
  const port = listenPort();
  return {
    local,
    urls: local ? lanUrls() : [],
    localUrl: local ? `http://127.0.0.1:${port}` : "",
    dataDir: local ? dataDir : "",
  };
}

export async function unlockStoreNow(password: string) {
  const given = password.trim();
  if (!given) return { ok: false as const, error: "Enter the store password." };
  await new Promise((resolve) => setTimeout(resolve, 120));
  const stored = await doorHash();
  const ok = stored ? hashesMatch(given, stored) : given === defaultDoor();
  if (!ok) return { ok: false as const, error: "Wrong password." };
  return { ok: true as const };
}

export async function setStorePasswordNow(token: string, password: string) {
  if (!token || !canWrite(token)) {
    return { ok: false as const, error: "Unlock the desk first." };
  }
  const next = password.trim();
  if (next.length < 4) {
    return { ok: false as const, error: "Password must be at least 4 characters." };
  }
  const { sql } = await sqlClient();
  const hash = doorDigest(next).toString("hex");
  await sql`
    insert into store_settings (id, door_hash, updated_at)
    values ('main', ${hash}, now())
    on conflict (id) do update set door_hash = excluded.door_hash, updated_at = now()
  `;
  return { ok: true as const };
}


async function doorHash() {
  try {
    const { sql } = await sqlClient();
    const rows = await sql<{ door_hash: string | null }>`
      select door_hash from store_settings where id = 'main'
    `;
    return rows[0]?.door_hash ?? null;
  } catch {
    return null;
  }
}

function hashesMatch(given: string, storedHex: string) {
  const left = doorDigest(given);
  let right: Buffer;
  try {
    right = Buffer.from(storedHex, "hex");
  } catch {
    return false;
  }
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export type PerformancePoint = { day: string; sales: number; cost: number; profit: number };

export function performanceFrom(orders: Order[]) {
  const live = orders.filter(isRecordedSale);
  const todayIso = new Date().toISOString().slice(0, 10);
  const today = live.filter((order) => order.createdAt.slice(0, 10) === todayIso);
  const revenue = live.reduce((n, order) => n + order.totalCents, 0);
  const cost = live.reduce((n, order) => n + orderCogs(order), 0);
  const profit = live.reduce((n, order) => n + orderProfit(order), 0);
  const vat = live.reduce((n, order) => n + order.taxCents, 0);
  const todayRevenue = today.reduce((n, order) => n + order.totalCents, 0);
  const todayCost = today.reduce((n, order) => n + orderCogs(order), 0);
  const todayProfit = today.reduce((n, order) => n + orderProfit(order), 0);
  const goods = live.reduce((n, order) => n + order.subtotalCents - order.discountCents, 0);
  const margin = goods > 0 ? profit / goods : 0;
  return {
    salesCount: live.length,
    revenue,
    cost,
    profit,
    vat,
    margin,
    todayRevenue,
    todayCost,
    todayProfit,
    todayCount: today.length,
  };
}
