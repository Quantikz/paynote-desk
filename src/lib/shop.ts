export type ShopProfile = {
  name: string;
  tagline: string;
  welcome: string;
  street: string;
  city: string;
  phone: string;
  hours: string;
  accent: string;
  ticketPrefix: string;
};

export const DEFAULT_SHOP: ShopProfile = {
  name: "Paynote",
  tagline: "Shop what is in stock today",
  welcome:
    "Place an order here, then come to the shop with your code. The QR holds the full order as JSON, so we can pack it even if we are offline. You pay at the counter.",
  street: "18 Adeola Odeku Street",
  city: "Victoria Island, Lagos",
  hours: "Open 8am–9pm, every day",
  phone: "0803 441 0184",
  accent: "#3f5c4a",
  ticketPrefix: "PN",
};

const HEX = /^#([0-9a-fA-F]{6})$/;

export function normalizeShop(value: unknown): ShopProfile {
  const row = value && typeof value === "object" ? (value as Partial<ShopProfile>) : {};
  const accent =
    typeof row.accent === "string" && HEX.test(row.accent.trim())
      ? row.accent.trim().toLowerCase()
      : DEFAULT_SHOP.accent;
  const prefix = String(row.ticketPrefix ?? DEFAULT_SHOP.ticketPrefix)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return {
    name: String(row.name ?? "").trim() || DEFAULT_SHOP.name,
    tagline: String(row.tagline ?? "").trim() || DEFAULT_SHOP.tagline,
    welcome: String(row.welcome ?? "").trim() || DEFAULT_SHOP.welcome,
    street: String(row.street ?? "").trim() || DEFAULT_SHOP.street,
    city: String(row.city ?? "").trim() || DEFAULT_SHOP.city,
    phone: String(row.phone ?? "").trim() || DEFAULT_SHOP.phone,
    hours: String(row.hours ?? "").trim() || DEFAULT_SHOP.hours,
    accent,
    ticketPrefix: prefix || DEFAULT_SHOP.ticketPrefix,
  };
}
