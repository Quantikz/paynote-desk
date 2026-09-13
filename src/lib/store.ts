import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PROMOS,
  type CartLine,
  type Fulfillment,
  type Order,
  type OrderStatus,
  type Product,
  type PayMethod,
  type Promo,
  type StockMove,
} from "@/lib/catalog";
import { DEFAULT_SHOP, type ShopProfile } from "@/lib/shop";
import { nid, slugify, TAX_RATE, ngn } from "@/lib/money";

export type CheckoutInput = {
  fulfillment: Fulfillment;
  slot: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  promoCode?: string;
  tipCents: number;
  walkIn?: boolean;
  status?: OrderStatus;
  payment?: PayMethod;
};

type MarketState = {
  products: Product[];
  cart: CartLine[];
  saved: string[];
  orders: Order[];
  promos: Promo[];
  moves: StockMove[];
  orderSeq: number;
  cartOpen: boolean;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setCartOpen: (open: boolean) => void;
  product: (id: string) => Product | undefined;
  liveProducts: () => Product[];
  cartCount: () => number;
  cartLines: () => { product: Product; qty: number; lineCents: number }[];
  cartSubtotal: () => number;
  addToCart: (productId: string, qty?: number, opts?: { open?: boolean }) => boolean;
  setCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleSaved: (productId: string) => void;
  applyPromo: (code: string, subtotal: number) => { promo?: Promo; discount: number; error?: string };
  placeOrder: (input: CheckoutInput) => { order?: Order; error?: string };
  ringUp: (ticket: CartLine[], input: CheckoutInput) => { order?: Order; error?: string };
  setOrderStatus: (id: string, status: OrderStatus) => void;
  upsertProduct: (product: Product) => void;
  adjustStock: (productId: string, delta: number, reason: string) => void;
  upsertPromo: (promo: Promo) => void;
  resetDemo: () => void;
  pruneCart: () => void;
  collectOrder: (id: string, payment: PayMethod) => { error?: string };
  acceptTicket: (order: Order) => Order;
  applyShelf: (products: Product[], promos: Promo[], version: number, shop?: ShopProfile) => void;
  applyShop: (shop: ShopProfile) => void;
  shop: ShopProfile;
  shelfVersion: number;
};

function discountFor(promo: Promo, subtotal: number) {
  if (promo.code === "BIG15" && subtotal < ngn(15000)) return 0;
  if (promo.percentOff) return Math.round(subtotal * (promo.percentOff / 100));
  if (promo.amountOffCents) return Math.min(promo.amountOffCents, subtotal);
  return 0;
}

const seed = {
  products: SEED_PRODUCTS,
  cart: [] as CartLine[],
  saved: ["sourdough", "eggs"] as string[],
  orders: SEED_ORDERS,
  promos: SEED_PROMOS,
  moves: [] as StockMove[],
  orderSeq: 1836,
  cartOpen: false,
  shop: DEFAULT_SHOP,
  shelfVersion: 0,
};

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => ({
      ...seed,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setCartOpen: (open) => set({ cartOpen: open }),
      product: (id) => get().products.find((p) => p.id === id),
      liveProducts: () => get().products.filter((p) => p.active && p.stock > 0),
      cartCount: () => get().cart.reduce((n, line) => n + line.qty, 0),
      cartLines: () =>
        get()
          .cart.map((line) => {
            const product = get().product(line.productId);
            if (!product) return null;
            return {
              product,
              qty: line.qty,
              lineCents: product.priceCents * line.qty,
            };
          })
          .filter((row): row is { product: Product; qty: number; lineCents: number } => row !== null),
      cartSubtotal: () => get().cartLines().reduce((n, line) => n + line.lineCents, 0),
      addToCart: (productId, qty = 1, opts) => {
        const product = get().product(productId);
        if (!product || !product.active || product.stock <= 0) return false;
        const existing = get().cart.find((line) => line.productId === productId)?.qty ?? 0;
        const next = Math.min(product.stock, existing + qty);
        if (next <= 0) return false;
        set((state) => ({
          cart: existing
            ? state.cart.map((line) =>
                line.productId === productId ? { ...line, qty: next } : line,
              )
            : [...state.cart, { productId, qty: next }],
          cartOpen: opts?.open === false ? state.cartOpen : true,
        }));
        return true;
      },
      setCartQty: (productId, qty) => {
        const product = get().product(productId);
        if (!product) return;
        const next = Math.max(0, Math.min(product.stock, qty));
        set((state) => ({
          cart:
            next === 0
              ? state.cart.filter((line) => line.productId !== productId)
              : state.cart.map((line) =>
                  line.productId === productId ? { ...line, qty: next } : line,
                ),
        }));
      },
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((line) => line.productId !== productId),
        })),
      clearCart: () => set({ cart: [] }),
      toggleSaved: (productId) =>
        set((state) => ({
          saved: state.saved.includes(productId)
            ? state.saved.filter((id) => id !== productId)
            : [...state.saved, productId],
        })),
      applyPromo: (code, subtotal) => {
        const promo = get().promos.find(
          (item) => item.active && item.code.toLowerCase() === code.trim().toLowerCase(),
        );
        if (!promo) return { discount: 0, error: "That code is not valid." };
        const discount = discountFor(promo, subtotal);
        if (discount === 0 && promo.code === "BIG15") {
          return { promo, discount: 0, error: "BIG15 starts from ₦15,000." };
        }
        return { promo, discount };
      },
      placeOrder: (input) => {
        const lines = get().cartLines();
        if (lines.length === 0) return { error: "The cart is empty." };
        for (const line of lines) {
          if (line.qty > line.product.stock) {
            return { error: `${line.product.name} only has ${line.product.stock} left.` };
          }
        }
        const subtotalCents = lines.reduce((n, line) => n + line.lineCents, 0);
        let discountCents = 0;
        let promoCode: string | undefined;
        if (input.promoCode) {
          const applied = get().applyPromo(input.promoCode, subtotalCents);
          if (applied.error && applied.discount === 0) return { error: applied.error };
          discountCents = applied.discount;
          promoCode = applied.promo?.code;
        }
        const afterDiscount = Math.max(0, subtotalCents - discountCents);
        const deliveryCents = 0;
        const taxCents = Math.round(afterDiscount * TAX_RATE);
        const tipCents = Math.max(0, input.tipCents);
        const totalCents = afterDiscount + deliveryCents + taxCents + tipCents;
        const seq = get().orderSeq;
        const order: Order = {
          id: nid("ord"),
          number: `${get().shop.ticketPrefix}-${seq}`,
          createdAt: new Date().toISOString(),
          status: input.status ?? "placed",
          fulfillment: input.fulfillment,
          slot: input.slot,
          customer: {
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email.trim(),
            address: input.address?.trim() || undefined,
          },
          items: lines.map((line) => ({
            productId: line.product.id,
            sku: line.product.sku,
            name: line.product.name,
            unit: line.product.unit,
            qty: line.qty,
            priceCents: line.product.priceCents,
          })),
          subtotalCents,
          discountCents,
          deliveryCents,
          taxCents,
          tipCents,
          totalCents,
          promoCode,
          notes: input.notes?.trim() || undefined,
          walkIn: input.walkIn,
          payment: input.payment,
        };
        set((state) => ({
          orderSeq: seq + 1,
          cart: [],
          cartOpen: false,
          orders: [order, ...state.orders],
          products: state.products.map((product) => {
            const line = lines.find((item) => item.product.id === product.id);
            if (!line) return product;
            return { ...product, stock: Math.max(0, product.stock - line.qty) };
          }),
          moves: [
            ...lines.map((line) => ({
              id: nid("mv"),
              productId: line.product.id,
              delta: -line.qty,
              reason: input.walkIn ? `Register ${order.number}` : `Order ${order.number}`,
              at: order.createdAt,
            })),
            ...state.moves,
          ],
        }));
        return { order };
      },
      ringUp: (ticket, input) => {
        const savedCart = get().cart;
        const savedOpen = get().cartOpen;
        set({ cart: ticket, cartOpen: false });
        const result = get().placeOrder(input);
        set({ cart: savedCart, cartOpen: savedOpen });
        return result;
      },
      setOrderStatus: (id, status) =>
        set((state) => {
          const current = state.orders.find((order) => order.id === id);
          if (!current || current.status === status) return state;
          let products = state.products;
          let moves = state.moves;
          if (status === "cancelled" && current.status !== "cancelled") {
            products = products.map((product) => {
              const line = current.items.find((item) => item.productId === product.id);
              if (!line) return product;
              return { ...product, stock: product.stock + line.qty };
            });
            moves = [
              ...current.items.map((item) => ({
                id: nid("mv"),
                productId: item.productId,
                delta: item.qty,
                reason: `Restock ${current.number}`,
                at: new Date().toISOString(),
              })),
              ...moves,
            ];
          }
          return {
            products,
            moves,
            orders: state.orders.map((order) =>
              order.id === id ? { ...order, status } : order,
            ),
          };
        }),
      upsertProduct: (product) =>
        set((state) => {
          const id = product.id || slugify(product.name) || nid("p");
          const next = { ...product, id };
          const exists = state.products.some((item) => item.id === id);
          return {
            products: exists
              ? state.products.map((item) => (item.id === id ? next : item))
              : [next, ...state.products],
          };
        }),
      adjustStock: (productId, delta, reason) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? { ...product, stock: Math.max(0, product.stock + delta) }
              : product,
          ),
          moves: [
            {
              id: nid("mv"),
              productId,
              delta,
              reason,
              at: new Date().toISOString(),
            },
            ...state.moves,
          ],
        })),
      upsertPromo: (promo) =>
        set((state) => {
          const code = promo.code.trim().toUpperCase();
          const next = { ...promo, code };
          const exists = state.promos.some((item) => item.code === code);
          return {
            promos: exists
              ? state.promos.map((item) => (item.code === code ? next : item))
              : [next, ...state.promos],
          };
        }),
      collectOrder: (id, payment) => {
        const order = get().orders.find((item) => item.id === id);
        if (!order) return { error: "We cannot find that order." };
        if (order.status === "cancelled") return { error: "This order was cancelled." };
        if (order.status === "delivered") return { error: "This order is already collected." };
        set((state) => ({
          orders: state.orders.map((item) =>
            item.id === id
              ? { ...item, status: "delivered" as const, payment, fulfillment: "pickup" as const }
              : item,
          ),
        }));
        return {};
      },
      acceptTicket: (order) => {
        const existing = get().orders.find((item) => item.id === order.id || item.number === order.number);
        if (existing) {
          const merged: Order = {
            ...order,
            id: existing.id,
            status: existing.status === "delivered" || existing.status === "cancelled" ? existing.status : order.status,
            payment: existing.payment ?? order.payment,
          };
          set((state) => ({
            orders: state.orders.map((item) => (item.id === existing.id ? merged : item)),
          }));
          return merged;
        }
        set((state) => ({
          orders: [order, ...state.orders],
        }));
        return order;
      },
      applyShelf: (products, promos, version, shop) => {
        if (!products.length || version <= get().shelfVersion) return;
        set({
          products,
          promos,
          shelfVersion: version,
          ...(shop ? { shop } : {}),
        });
        get().pruneCart();
      },
      applyShop: (shop) => set({ shop }),
      pruneCart: () => {
        const { cart, products } = get();
        const next = cart
          .map((line) => {
            const product = products.find((item) => item.id === line.productId);
            if (!product || !product.active || product.stock <= 0) return null;
            const qty = Math.min(line.qty, product.stock);
            return qty > 0 ? { productId: line.productId, qty } : null;
          })
          .filter((row): row is CartLine => row !== null);
        if (
          next.length !== cart.length ||
          next.some((line, i) => line.productId !== cart[i]?.productId || line.qty !== cart[i]?.qty)
        ) {
          set({ cart: next });
        }
      },
      resetDemo: () =>
        set({
          ...seed,
          hydrated: true,
        }),
    }),
    {
      name: "paynote-ng-v1",
      skipHydration: true,
      partialize: (state) => ({
        products: state.products,
        cart: state.cart,
        saved: state.saved,
        orders: state.orders,
        promos: state.promos,
        moves: state.moves,
        orderSeq: state.orderSeq,
        shop: state.shop,
        shelfVersion: state.shelfVersion,
      }),
    },
  ),
);
