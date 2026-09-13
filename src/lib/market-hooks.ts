import { useMemo } from "react";
import type { Product } from "@/lib/catalog";
import { DEFAULT_SHOP } from "@/lib/shop";
import { useMarket } from "@/lib/store";

export function useShop() {
  return useMarket((state) => state.shop) ?? DEFAULT_SHOP;
}

export function useLiveProducts() {
  const products = useMarket((s) => s.products);
  return useMemo(() => products.filter((p) => p.active && p.stock > 0), [products]);
}

export function useCartLines() {
  const cart = useMarket((s) => s.cart);
  const products = useMarket((s) => s.products);
  return useMemo(
    () =>
      cart
        .map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product) return null;
          return {
            product,
            qty: line.qty,
            lineCents: product.priceCents * line.qty,
          };
        })
        .filter((row): row is { product: Product; qty: number; lineCents: number } => row !== null),
    [cart, products],
  );
}

export function useCartCount() {
  return useMarket((s) => s.cart.reduce((n, line) => n + line.qty, 0));
}

export function useCartSubtotal() {
  const lines = useCartLines();
  return useMemo(() => lines.reduce((n, line) => n + line.lineCents, 0), [lines]);
}
