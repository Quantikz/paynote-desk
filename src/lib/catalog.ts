import { ngn } from "@/lib/money";

export const CATEGORIES = [
  { id: "produce", label: "Fruits & vegetables", blurb: "Fresh produce we have in the shop today" },
  { id: "dairy", label: "Dairy & eggs", blurb: "Milk, yoghurt, cheese and eggs" },
  { id: "bakery", label: "Bread & pastry", blurb: "Baked in the morning" },
  { id: "meat", label: "Meat & fish", blurb: "From the butcher counter" },
  { id: "pantry", label: "Dry food", blurb: "Rice, oil, tins and spices" },
  { id: "frozen", label: "Frozen", blurb: "Kept in the freezer" },
  { id: "beverages", label: "Drinks", blurb: "Water, juice, malt and coffee" },
  { id: "household", label: "Home", blurb: "Soap, tissue and washing items" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const PLATES = [
  "leaf",
  "tomato",
  "citrus",
  "cream",
  "crust",
  "wine",
  "ocean",
  "char",
  "mist",
  "grain",
  "blossom",
  "frost",
] as const;

export type PlateId = (typeof PLATES)[number];

export type Product = {
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  category: CategoryId;
  priceCents: number;
  compareAtCents?: number;
  unit: string;
  stock: number;
  reorderAt: number;
  featured: boolean;
  active: boolean;
  plate: PlateId;
  origin?: string;
  dealLabel?: string;
  image?: string;
};

export type CartLine = { productId: string; qty: number };

export type OrderStatus =
  | "placed"
  | "packing"
  | "ready"
  | "out"
  | "delivered"
  | "cancelled";

export type Fulfillment = "delivery" | "pickup";

export type PayMethod = "delivery" | "transfer" | "card" | "cash";

export type OrderItem = {
  productId: string;
  sku?: string;
  name: string;
  unit: string;
  qty: number;
  priceCents: number;
};

export type Order = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  slot: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address?: string;
  };
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  promoCode?: string;
  notes?: string;
  walkIn?: boolean;
  payment?: PayMethod;
};

export function isRecordedSale(order: Order) {
  if (order.status === "cancelled") return false;
  return Boolean(order.walkIn) || order.status === "delivered";
}

export function saleKind(order: Order): "scan" | "store" {
  return order.walkIn ? "store" : "scan";
}

export function findProductByScan(products: Product[], raw: string): Product | undefined {
  const code = raw.trim().toLowerCase();
  if (!code) return undefined;
  const compact = code.replace(/[^a-z0-9]/g, "");
  return products.find((product) => {
    const sku = product.sku.toLowerCase();
    const id = product.id.toLowerCase();
    return (
      sku === code ||
      id === code ||
      sku.replace(/[^a-z0-9]/g, "") === compact ||
      id.replace(/[^a-z0-9]/g, "") === compact
    );
  });
}

export type Promo = {
  code: string;
  label: string;
  percentOff?: number;
  amountOffCents?: number;
  active: boolean;
};

export type StockMove = {
  id: string;
  productId: string;
  delta: number;
  reason: string;
  at: string;
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Waiting",
  packing: "Packing",
  ready: "Ready to collect",
  out: "Ready to collect",
  delivered: "Collected",
  cancelled: "Cancelled",
};

export const STATUS_FLOW: OrderStatus[] = ["placed", "packing", "ready", "delivered"];

export const PAY_LABEL: Record<PayMethod, string> = {
  delivery: "Pay on delivery",
  transfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
};

function sku(
  id: string,
  code: string,
  name: string,
  subtitle: string,
  category: CategoryId,
  price: number,
  unit: string,
  stock: number,
  plate: PlateId,
  extra: Partial<Product> = {},
): Product {
  return {
    id,
    sku: code,
    name,
    subtitle,
    category,
    unit,
    stock,
    reorderAt: extra.reorderAt ?? 8,
    featured: extra.featured ?? false,
    active: extra.active ?? true,
    plate,
    ...extra,
    priceCents: extra.priceCents ?? ngn(price),
  };
}

export const SEED_PRODUCTS: Product[] = [
  sku("tomatoes", "PN-PR-014", "Jos tomatoes", "Fresh, sold by the kilogram", "produce", 2800, "kg", 42, "tomato", {
    featured: true,
    origin: "Jos Plateau",
    dealLabel: "In season",
    reorderAt: 12,
  }),
  sku("avocados", "PN-PR-022", "Avocado", "Ripe and ready to eat", "produce", 1800, "piece", 28, "leaf", {
    featured: true,
    origin: "Ibadan",
  }),
  sku("bananas", "PN-PR-031", "Bananas", "Yellow, sold by the kilogram", "produce", 1200, "kg", 64, "citrus", {
    compareAtCents: ngn(1500),
    dealLabel: "Promo",
    reorderAt: 16,
  }),
  sku("spinach", "PN-PR-044", "Spinach", "Washed and packed", "produce", 900, "pack", 7, "leaf", {
    origin: "Ogun",
    reorderAt: 10,
  }),
  sku("apples", "PN-PR-051", "Apples", "Crisp, sold by the kilogram", "produce", 3500, "kg", 51, "blossom", {
    featured: true,
    origin: "Imported",
    dealLabel: "This week",
    reorderAt: 14,
  }),
  sku("cucumber", "PN-PR-063", "Cucumber", "Long, fresh", "produce", 600, "piece", 36, "leaf"),
  sku("onions", "PN-PR-070", "Red onions", "For stew and rice", "produce", 1800, "kg", 40, "wine", { reorderAt: 12 }),
  sku("lemons", "PN-PR-081", "Lemons", "For drinks and cooking", "produce", 2200, "kg", 22, "citrus", {
    origin: "Benue",
  }),
  sku("kale", "PN-PR-090", "Kale", "Sold by the bunch", "produce", 800, "bunch", 18, "leaf", { reorderAt: 6 }),
  sku("milk", "PN-DY-010", "Full cream milk", "One litre carton", "dairy", 2400, "1 L", 33, "cream", {
    origin: "Nigeria",
    reorderAt: 10,
  }),
  sku("yogurt", "PN-DY-018", "Natural yoghurt", "Thick, unsweetened", "dairy", 2800, "500 ml", 24, "cream", {
    featured: true,
    compareAtCents: ngn(3200),
    dealLabel: "House pack",
  }),
  sku("cheddar", "PN-DY-027", "Cheddar cheese", "400 gram pack", "dairy", 4500, "400 g", 16, "citrus", { reorderAt: 6 }),
  sku("eggs", "PN-DY-033", "Eggs", "Crate of 30", "dairy", 6200, "crate", 41, "cream", {
    featured: true,
    origin: "Oyo farms",
    reorderAt: 12,
  }),
  sku("butter", "PN-DY-041", "Butter", "Salted, 250 gram", "dairy", 3800, "250 g", 19, "cream", { reorderAt: 6 }),
  sku("cream", "PN-DY-055", "Fresh cream", "For cooking and dessert", "dairy", 2200, "250 ml", 21, "mist"),
  sku("sourdough", "PN-BK-004", "Agege bread", "Fresh from the bakery", "bakery", 1500, "loaf", 14, "crust", {
    featured: true,
    origin: "Baked here",
    dealLabel: "Baked today",
    reorderAt: 6,
  }),
  sku("croissants", "PN-BK-012", "Butter croissants", "Pack of four", "bakery", 3200, "4 pack", 11, "crust", { reorderAt: 6 }),
  sku("bagels", "PN-BK-019", "Soft rolls", "Pack of six", "bakery", 1800, "6 pack", 17, "grain", { reorderAt: 6 }),
  sku("sandwich-bread", "PN-BK-028", "Sliced bread", "Soft loaf for sandwich", "bakery", 1400, "loaf", 20, "crust"),
  sku("chicken", "PN-MT-007", "Chicken breast", "Fresh, sold by the kilogram", "meat", 7500, "kg", 5, "blossom", {
    origin: "Ibadan",
    reorderAt: 10,
  }),
  sku("beef", "PN-MT-015", "Minced beef", "Fresh grind, one kilogram", "meat", 6800, "kg", 18, "char"),
  sku("salmon", "PN-MT-023", "Fresh croaker", "Cleaned, sold by the kilogram", "meat", 8500, "kg", 4, "ocean", {
    featured: true,
    origin: "Lagos waters",
    dealLabel: "Fish counter",
    reorderAt: 6,
  }),
  sku("bacon", "PN-MT-031", "Smoked bacon", "500 gram pack", "meat", 5500, "500 g", 13, "char", { reorderAt: 6 }),
  sku("olive-oil", "PN-PN-006", "Vegetable oil", "2.5 litre bottle", "pantry", 8500, "2.5 L", 22, "leaf", {
    featured: true,
    origin: "Nigeria",
    reorderAt: 6,
  }),
  sku("rice", "PN-PN-014", "Ofada rice", "5 kilogram bag", "pantry", 11500, "5 kg", 27, "grain"),
  sku("tomatoes-can", "PN-PN-021", "Tin tomatoes", "400 gram tin", "pantry", 900, "400 g", 31, "tomato", { reorderAt: 10 }),
  sku("salt", "PN-PN-030", "Table salt", "Iodized, 500 gram", "pantry", 700, "500 g", 15, "mist", { reorderAt: 5 }),
  sku("honey", "PN-PN-038", "Wild honey", "Pure, 500 gram jar", "pantry", 4500, "500 g", 12, "citrus", {
    origin: "Benue",
    reorderAt: 4,
  }),
  sku("beans", "PN-PN-047", "Honey beans", "Oloyin, 2 kilogram", "pantry", 4200, "2 kg", 26, "char"),
  sku("berries", "PN-FZ-003", "Mixed berries", "Frozen, 400 gram", "frozen", 3200, "400 g", 18, "wine", { reorderAt: 6 }),
  sku("ice-cream", "PN-FZ-011", "Vanilla ice cream", "One litre tub", "frozen", 2800, "1 L", 16, "cream", {
    compareAtCents: ngn(3400),
    dealLabel: "Cold promo",
    reorderAt: 6,
  }),
  sku("peas", "PN-FZ-018", "Garden peas", "Frozen, 400 gram", "frozen", 1800, "400 g", 23, "leaf"),
  sku("dough", "PN-FZ-026", "Puff-puff mix", "Ready dough, one pack", "frozen", 1500, "pack", 14, "crust", { reorderAt: 6 }),
  sku("sparkling", "PN-BV-008", "Bottled water", "Pack of twelve", "beverages", 2500, "12 pack", 38, "mist", { reorderAt: 12 }),
  sku("cold-brew", "PN-BV-016", "Cold coffee", "House brew, 1 litre", "beverages", 3800, "1 L", 9, "char", {
    origin: "Roasted here",
    reorderAt: 6,
  }),
  sku("oj", "PN-BV-024", "Orange juice", "Fresh, 1 litre", "beverages", 2200, "1 L", 20, "citrus"),
  sku("ginger-beer", "PN-BV-033", "Malt drink", "Pack of four", "beverages", 3200, "4 pack", 15, "grain", { reorderAt: 6 }),
  sku("dish-soap", "PN-HH-005", "Dishwashing liquid", "500 ml bottle", "household", 1800, "500 ml", 18, "ocean", {
    compareAtCents: ngn(2200),
    dealLabel: "Home promo",
    reorderAt: 6,
  }),
  sku("towels", "PN-HH-012", "Tissue rolls", "Pack of two", "household", 2500, "2 pack", 24, "mist"),
  sku("laundry", "PN-HH-020", "Washing powder", "1 kilogram pack", "household", 4500, "1 kg", 11, "frost", { reorderAt: 4 }),
];

export const SEED_PROMOS: Promo[] = [
  { code: "FRESH10", label: "10% off your order", percentOff: 10, active: true },
  { code: "N2K", label: "₦2,000 off any order", amountOffCents: ngn(2000), active: true },
  { code: "BIG15", label: "15% off from ₦15,000", percentOff: 15, active: true },
];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function plateClasses(plate: PlateId) {
  return {
    leaf: "bg-plate-leaf text-plate-leaf-fg",
    tomato: "bg-plate-tomato text-plate-tomato-fg",
    citrus: "bg-plate-citrus text-plate-citrus-fg",
    cream: "bg-plate-cream text-plate-cream-fg",
    crust: "bg-plate-crust text-plate-crust-fg",
    wine: "bg-plate-wine text-plate-wine-fg",
    ocean: "bg-plate-ocean text-plate-ocean-fg",
    char: "bg-plate-char text-plate-char-fg",
    mist: "bg-plate-mist text-plate-mist-fg",
    grain: "bg-plate-grain text-plate-grain-fg",
    blossom: "bg-plate-blossom text-plate-blossom-fg",
    frost: "bg-plate-frost text-plate-frost-fg",
  }[plate];
}

export function isDeal(product: Product) {
  return Boolean(product.compareAtCents && product.compareAtCents > product.priceCents);
}

export function onShelf(product: Product) {
  return product.active && product.stock > 0;
}

export function deliveryWindows() {
  const windows = ["8–11am", "12–3pm", "4–7pm"];
  const days: { key: string; label: string; slot: string }[] = [];
  const start = new Date("2026-09-13T12:00:00");
  for (let d = 0; d < 5; d += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const dayLabel = day.toLocaleDateString("en-NG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    for (const window of windows) {
      days.push({
        key: `${day.toISOString().slice(0, 10)}-${window}`,
        label: `${dayLabel} · ${window}`,
        slot: `${dayLabel} ${window}`,
      });
    }
  }
  return days;
}

export const SEED_ORDERS: Order[] = [
  {
    id: "ord-seed-1",
    number: "PN-1834",
    createdAt: "2026-09-13T09:12:00.000Z",
    status: "packing",
    fulfillment: "delivery",
    slot: "Sun, 13 Sep · 12–3pm",
    customer: {
      name: "Chioma Okeke",
      phone: "0803 441 2210",
      email: "chioma@example.com",
      address: "14 Admiralty Way, Lekki Phase 1",
    },
    items: [
      { productId: "tomatoes", name: "Jos tomatoes", unit: "kg", qty: 2, priceCents: ngn(2800) },
      { productId: "sourdough", name: "Agege bread", unit: "loaf", qty: 1, priceCents: ngn(1500) },
      { productId: "eggs", name: "Eggs", unit: "crate", qty: 1, priceCents: ngn(6200) },
    ],
    subtotalCents: ngn(13300),
    discountCents: 0,
    deliveryCents: 0,
    taxCents: ngn(998),
    tipCents: 0,
    totalCents: ngn(14298),
    notes: "Please call at the gate.",
    payment: "delivery",
  },
  {
    id: "ord-seed-2",
    number: "PN-1835",
    createdAt: "2026-09-13T11:40:00.000Z",
    status: "placed",
    fulfillment: "pickup",
    slot: "Sun, 13 Sep · 4–7pm",
    customer: {
      name: "Tunde Bakare",
      phone: "0802 555 0190",
      email: "tunde@example.com",
    },
    items: [
      { productId: "salmon", name: "Fresh croaker", unit: "kg", qty: 1, priceCents: ngn(8500) },
      { productId: "spinach", name: "Spinach", unit: "pack", qty: 2, priceCents: ngn(900) },
      { productId: "lemons", name: "Lemons", unit: "kg", qty: 1, priceCents: ngn(2200) },
    ],
    subtotalCents: ngn(12500),
    discountCents: ngn(1250),
    deliveryCents: 0,
    taxCents: ngn(844),
    tipCents: 0,
    totalCents: ngn(12094),
    promoCode: "FRESH10",
    payment: "transfer",
  },
  {
    id: "ord-seed-3",
    number: "PN-1832",
    createdAt: "2026-09-12T16:05:00.000Z",
    status: "out",
    fulfillment: "delivery",
    slot: "Sat, 12 Sep · 4–7pm",
    customer: {
      name: "Aisha Bello",
      phone: "0809 211 4418",
      email: "aisha@example.com",
      address: "9 Bode Thomas, Surulere",
    },
    items: [
      { productId: "milk", name: "Full cream milk", unit: "1 L", qty: 1, priceCents: ngn(2400) },
      { productId: "bananas", name: "Bananas", unit: "kg", qty: 3, priceCents: ngn(1200) },
      { productId: "yogurt", name: "Natural yoghurt", unit: "500 ml", qty: 1, priceCents: ngn(2800) },
      { productId: "apples", name: "Apples", unit: "kg", qty: 2, priceCents: ngn(3500) },
    ],
    subtotalCents: ngn(15800),
    discountCents: 0,
    deliveryCents: ngn(1500),
    taxCents: ngn(1185),
    tipCents: 0,
    totalCents: ngn(18485),
    payment: "delivery",
  },
  {
    id: "ord-seed-4",
    number: "PN-1829",
    createdAt: "2026-09-12T10:22:00.000Z",
    status: "delivered",
    fulfillment: "delivery",
    slot: "Sat, 12 Sep · 8–11am",
    customer: {
      name: "Emeka Nwosu",
      phone: "0814 330 0177",
      email: "emeka@example.com",
      address: "220 Allen Avenue, Ikeja",
    },
    items: [
      { productId: "olive-oil", name: "Vegetable oil", unit: "2.5 L", qty: 1, priceCents: ngn(8500) },
      { productId: "tomatoes-can", name: "Tin tomatoes", unit: "400 g", qty: 2, priceCents: ngn(900) },
      { productId: "cheddar", name: "Cheddar cheese", unit: "400 g", qty: 1, priceCents: ngn(4500) },
    ],
    subtotalCents: ngn(14800),
    discountCents: ngn(2000),
    deliveryCents: 0,
    taxCents: ngn(960),
    tipCents: 0,
    totalCents: ngn(13760),
    promoCode: "N2K",
    payment: "card",
  },
  {
    id: "ord-seed-5",
    number: "PN-1826",
    createdAt: "2026-09-11T18:48:00.000Z",
    status: "delivered",
    fulfillment: "pickup",
    slot: "Fri, 11 Sep · 4–7pm",
    customer: {
      name: "Walk-in",
      phone: "—",
      email: "counter@paynote.ng",
    },
    items: [
      { productId: "croissants", name: "Butter croissants", unit: "4 pack", qty: 1, priceCents: ngn(3200) },
      { productId: "cold-brew", name: "Cold coffee", unit: "1 L", qty: 1, priceCents: ngn(3800) },
    ],
    subtotalCents: ngn(7000),
    discountCents: 0,
    deliveryCents: 0,
    taxCents: ngn(525),
    tipCents: 0,
    totalCents: ngn(7525),
    walkIn: true,
    payment: "cash",
  },
  {
    id: "ord-seed-6",
    number: "PN-1821",
    createdAt: "2026-09-10T14:10:00.000Z",
    status: "delivered",
    fulfillment: "delivery",
    slot: "Thu, 10 Sep · 12–3pm",
    customer: {
      name: "Funke Adeyemi",
      phone: "0805 662 0133",
      email: "funke@example.com",
      address: "15 Glover Road, Ikoyi",
    },
    items: [
      { productId: "chicken", name: "Chicken breast", unit: "kg", qty: 2, priceCents: ngn(7500) },
      { productId: "rice", name: "Ofada rice", unit: "5 kg", qty: 1, priceCents: ngn(11500) },
      { productId: "spinach", name: "Spinach", unit: "pack", qty: 1, priceCents: ngn(900) },
    ],
    subtotalCents: ngn(27400),
    discountCents: 0,
    deliveryCents: 0,
    taxCents: ngn(2055),
    tipCents: 0,
    totalCents: ngn(29455),
    payment: "transfer",
  },
  {
    id: "ord-seed-7",
    number: "PN-1818",
    createdAt: "2026-09-09T09:05:00.000Z",
    status: "cancelled",
    fulfillment: "delivery",
    slot: "Tue, 9 Sep · 4–7pm",
    customer: {
      name: "Ibrahim Musa",
      phone: "0803 770 0164",
      email: "ibrahim@example.com",
      address: "88 Aminu Kano Crescent, Wuse 2",
    },
    items: [
      { productId: "ice-cream", name: "Vanilla ice cream", unit: "1 L", qty: 2, priceCents: ngn(2800) },
    ],
    subtotalCents: ngn(5600),
    discountCents: 0,
    deliveryCents: ngn(1500),
    taxCents: ngn(420),
    tipCents: 0,
    totalCents: ngn(7520),
    payment: "delivery",
  },
  {
    id: "ord-seed-8",
    number: "PN-1814",
    createdAt: "2026-09-08T17:30:00.000Z",
    status: "delivered",
    fulfillment: "delivery",
    slot: "Mon, 8 Sep · 4–7pm",
    customer: {
      name: "Ngozi Eze",
      phone: "0810 441 0102",
      email: "ngozi@example.com",
      address: "3 Akin Adesola, Victoria Island",
    },
    items: [
      { productId: "avocados", name: "Avocado", unit: "piece", qty: 1, priceCents: ngn(1800) },
      { productId: "eggs", name: "Eggs", unit: "crate", qty: 2, priceCents: ngn(6200) },
      { productId: "sourdough", name: "Agege bread", unit: "loaf", qty: 1, priceCents: ngn(1500) },
      { productId: "sparkling", name: "Bottled water", unit: "12 pack", qty: 1, priceCents: ngn(2500) },
    ],
    subtotalCents: ngn(18200),
    discountCents: 0,
    deliveryCents: 0,
    taxCents: ngn(1365),
    tipCents: 0,
    totalCents: ngn(19565),
    payment: "card",
  },
];

export { DEFAULT_SHOP as STORE } from "@/lib/shop";
