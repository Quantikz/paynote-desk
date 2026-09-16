import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QtyStepper } from "@/components/qty-stepper";
import { ProductThumb } from "@/components/product-still";
import { useCartLines, useCartSubtotal } from "@/lib/market-hooks";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export function CartDrawer() {
  const open = useMarket((s) => s.cartOpen);
  const setCartOpen = useMarket((s) => s.setCartOpen);
  const lines = useCartLines();
  const subtotal = useCartSubtotal();
  const setCartQty = useMarket((s) => s.setCartQty);

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent className="bg-background">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {lines.length === 0
              ? "Your cart is empty."
              : "Confirm the order, then collect and pay at the shop."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag className="size-8 text-muted-foreground" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Add items from the shop. If we sell out, the item will leave your cart.
              </p>
              <Button variant="outline" onClick={() => setCartOpen(false)}>
                Keep shopping
              </Button>
            </div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex gap-3 rounded-lg bg-card p-2">
                    <ProductThumb product={line.product} className="mt-1 size-14" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {money(line.product.priceCents)} / {line.product.unit}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <QtyStepper
                          value={line.qty}
                          max={line.product.stock}
                          onChange={(qty) => setCartQty(line.product.id, qty)}
                          className="h-9"
                        />
                        <p className="text-sm tabular-nums">{money(line.lineCents)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{money(subtotal)}</span>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  You pay at the shop when the officer scans your code.
                </p>
                <Button asChild className="w-full" size="lg">
                  <Link to="/checkout" onClick={() => setCartOpen(false)}>
                    Confirm order
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

