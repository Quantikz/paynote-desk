import type { Order, OrderItem, OrderStatus, PayMethod } from "@/lib/catalog";
import { DEFAULT_SHOP, type ShopProfile } from "@/lib/shop";
import { TAX_RATE } from "@/lib/money";

export type TicketJson = {
  app: "paynote";
  v: 2;
  kind: "collection-ticket";
  currency: "NGN";
  taxRate: number;
  issuedAt: string;
  payAtShop: true;
  offline: true;
  shop: {
    name: string;
    street: string;
    city: string;
    phone: string;
    hours: string;
  };
  order: {
    id: string;
    number: string;
    createdAt: string;
    status: OrderStatus;
    fulfillment: Order["fulfillment"];
    slot: string;
    walkIn: boolean;
    payment?: PayMethod;
    customer: {
      name: string;
      phone: string;
      email: string;
      address?: string;
    };
    items: Array<{
      productId: string;
      sku: string;
      name: string;
      unit: string;
      qty: number;
      priceNaira: number;
      lineNaira: number;
    }>;
    subtotalNaira: number;
    discountNaira: number;
    deliveryNaira: number;
    vatNaira: number;
    tipNaira: number;
    totalNaira: number;
    promoCode?: string;
    notes?: string;
  };
  checksum: string;
};

type LegacyTicket = {
  app: "paynote";
  v: 1;
  order: {
    id: string;
    number: string;
    createdAt: string;
    status: OrderStatus;
    shop: { name: string; street: string; city: string; phone: string };
    customer: { name: string; phone: string };
    items: Array<{
      productId: string;
      name: string;
      unit: string;
      qty: number;
      priceNaira: number;
      lineNaira: number;
    }>;
    subtotalNaira: number;
    discountNaira: number;
    vatNaira: number;
    totalNaira: number;
    promoCode?: string;
    notes?: string;
    payAtShop: true;
  };
};

function naira(kobo: number) {
  return Math.round(kobo / 100);
}

function kobo(nairaValue: number) {
  return Math.round(nairaValue * 100);
}

function checksum(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function orderToTicket(order: Order, shop: ShopProfile = DEFAULT_SHOP): TicketJson {
  const body: Omit<TicketJson, "checksum"> = {
    app: "paynote",
    v: 2,
    kind: "collection-ticket",
    currency: "NGN",
    taxRate: TAX_RATE,
    issuedAt: new Date().toISOString(),
    payAtShop: true,
    offline: true,
    shop: {
      name: shop.name,
      street: shop.street,
      city: shop.city,
      phone: shop.phone,
      hours: shop.hours,
    },
    order: {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      status: order.status,
      fulfillment: order.fulfillment,
      slot: order.slot,
      walkIn: Boolean(order.walkIn),
      payment: order.payment,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        address: order.customer.address,
      },
      items: order.items.map((item) => ({
        productId: item.productId,
        sku: item.sku || item.productId.toUpperCase(),
        name: item.name,
        unit: item.unit,
        qty: item.qty,
        priceNaira: naira(item.priceCents),
        lineNaira: naira(item.priceCents * item.qty),
      })),
      subtotalNaira: naira(order.subtotalCents),
      discountNaira: naira(order.discountCents),
      deliveryNaira: naira(order.deliveryCents),
      vatNaira: naira(order.taxCents),
      tipNaira: naira(order.tipCents),
      totalNaira: naira(order.totalCents),
      promoCode: order.promoCode,
      notes: order.notes,
    },
  };
  return { ...body, checksum: checksum(body) };
}

export function ticketToOrder(ticket: TicketJson | LegacyTicket): Order {
  if (ticket.v === 1) {
    const o = ticket.order;
    const items: OrderItem[] = o.items.map((item) => ({
      productId: item.productId,
      sku: item.productId.toUpperCase(),
      name: item.name,
      unit: item.unit,
      qty: item.qty,
      priceCents: kobo(item.priceNaira),
    }));
    return {
      id: o.id,
      number: o.number,
      createdAt: o.createdAt,
      status: o.status ?? "placed",
      fulfillment: "pickup",
      slot: "Collect at shop",
      customer: {
        name: o.customer.name,
        phone: o.customer.phone,
        email: "",
      },
      items,
      subtotalCents: kobo(o.subtotalNaira),
      discountCents: kobo(o.discountNaira),
      deliveryCents: 0,
      taxCents: kobo(o.vatNaira),
      tipCents: 0,
      totalCents: kobo(o.totalNaira),
      promoCode: o.promoCode,
      notes: o.notes,
    };
  }

  const o = ticket.order;
  const items: OrderItem[] = o.items.map((item) => ({
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    qty: item.qty,
    priceCents: kobo(item.priceNaira),
  }));
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt,
    status: o.status ?? "placed",
    fulfillment: o.fulfillment ?? "pickup",
    slot: o.slot || "Collect at shop",
    customer: {
      name: o.customer.name,
      phone: o.customer.phone,
      email: o.customer.email || "",
      address: o.customer.address,
    },
    items,
    subtotalCents: kobo(o.subtotalNaira),
    discountCents: kobo(o.discountNaira),
    deliveryCents: kobo(o.deliveryNaira),
    taxCents: kobo(o.vatNaira),
    tipCents: kobo(o.tipNaira),
    totalCents: kobo(o.totalNaira),
    promoCode: o.promoCode,
    notes: o.notes,
    walkIn: o.walkIn,
    payment: o.payment,
  };
}

export function ticketDocument(order: Order, shop?: ShopProfile) {
  return orderToTicket(order, shop);
}

export function ticketPayload(order: Order, shop?: ShopProfile) {
  return JSON.stringify(orderToTicket(order, shop));
}

export function prettyTicket(order: Order, shop?: ShopProfile) {
  return JSON.stringify(orderToTicket(order, shop), null, 2);
}

export function ticketFileName(order: Order) {
  return `${order.number.replace(/\s+/g, "-")}.json`;
}

function isTicketJson(value: unknown): value is TicketJson {
  if (!value || typeof value !== "object") return false;
  const row = value as TicketJson;
  return row.app === "paynote" && row.v === 2 && Boolean(row.order?.id) && Array.isArray(row.order.items);
}

function isLegacyTicket(value: unknown): value is LegacyTicket {
  if (!value || typeof value !== "object") return false;
  const row = value as LegacyTicket;
  return row.app === "paynote" && row.v === 1 && Boolean(row.order?.id) && Array.isArray(row.order.items);
}

export function ticketIntegrity(ticket: TicketJson) {
  const { checksum: given, ...body } = ticket;
  return given === checksum(body);
}

export function decodeTicket(raw: string): {
  order?: Order;
  number?: string;
  id?: string;
  fromJson?: boolean;
  tampered?: boolean;
} {
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isTicketJson(parsed)) {
        return {
          order: ticketToOrder(parsed),
          number: parsed.order.number,
          id: parsed.order.id,
          fromJson: true,
          tampered: !ticketIntegrity(parsed),
        };
      }
      if (isLegacyTicket(parsed)) {
        return {
          order: ticketToOrder(parsed),
          number: parsed.order.number,
          id: parsed.order.id,
          fromJson: true,
        };
      }
    } catch {
      // fall through
    }
  }
  const tagged = text.match(/^PAYNOTE:([^:]+):(.+)$/i);
  if (tagged) return { number: tagged[1], id: tagged[2] };
  if (/^PN-\d+/i.test(text)) return { number: text.toUpperCase() };
  if (text.startsWith("ord-")) return { id: text };
  return { number: text, id: text };
}

export function findOrder(orders: Order[], raw: string) {
  const decoded = decodeTicket(raw);
  if (decoded.order) return decoded.order;
  return orders.find(
    (order) =>
      (decoded.id && order.id === decoded.id) ||
      (decoded.number && order.number.toLowerCase() === decoded.number.toLowerCase()),
  );
}

export function downloadTicketFile(order: Order, shop?: ShopProfile) {
  const blob = new Blob([prettyTicket(order, shop)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ticketFileName(order);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
