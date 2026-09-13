import { STORE, type Order, type OrderItem } from "@/lib/catalog";

export type TicketJson = {
  app: "paynote";
  v: 1;
  order: {
    id: string;
    number: string;
    createdAt: string;
    status: Order["status"];
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

export function orderToTicket(order: Order): TicketJson {
  return {
    app: "paynote",
    v: 1,
    order: {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      status: order.status,
      shop: {
        name: STORE.name,
        street: STORE.street,
        city: STORE.city,
        phone: STORE.phone,
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unit: item.unit,
        qty: item.qty,
        priceNaira: naira(item.priceCents),
        lineNaira: naira(item.priceCents * item.qty),
      })),
      subtotalNaira: naira(order.subtotalCents),
      discountNaira: naira(order.discountCents),
      vatNaira: naira(order.taxCents),
      totalNaira: naira(order.totalCents),
      promoCode: order.promoCode,
      notes: order.notes,
      payAtShop: true,
    },
  };
}

export function ticketToOrder(ticket: TicketJson): Order {
  const o = ticket.order;
  const items: OrderItem[] = o.items.map((item) => ({
    productId: item.productId,
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

export function ticketPayload(order: Order) {
  return JSON.stringify(orderToTicket(order));
}

function isTicketJson(value: unknown): value is TicketJson {
  if (!value || typeof value !== "object") return false;
  const row = value as TicketJson;
  return row.app === "paynote" && row.v === 1 && Boolean(row.order?.id) && Array.isArray(row.order.items);
}

export function decodeTicket(raw: string): { order?: Order; number?: string; id?: string } {
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isTicketJson(parsed)) return { order: ticketToOrder(parsed), number: parsed.order.number, id: parsed.order.id };
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
  if (decoded.order) {
    return (
      orders.find((order) => order.id === decoded.order?.id || order.number === decoded.order?.number) ??
      decoded.order
    );
  }
  return orders.find(
    (order) =>
      (decoded.id && order.id === decoded.id) ||
      (decoded.number && order.number.toLowerCase() === decoded.number.toLowerCase()),
  );
}
