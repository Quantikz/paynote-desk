import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo } from "react";
import { StorefrontShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/lib/catalog";
import { useLiveProducts } from "@/lib/market-hooks";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const allOrders = useMarket((s) => s.orders);
  const orders = useMemo(() => allOrders.filter((order) => !order.walkIn), [allOrders]);
  const savedIds = useMarket((s) => s.saved);
  const products = useLiveProducts();
  const saved = products.filter((p) => savedIds.includes(p.id));
  const addToCart = useMarket((s) => s.addToCart);

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Account</p>
        <h1 className="font-display mt-1 text-4xl">My orders</h1>
        <p className="mt-2 text-muted-foreground">
          Orders stay on this phone. Open a receipt to see packing and delivery.
        </p>

        {saved.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-xl">Saved</h2>
            <ul className="mt-3 divide-y divide-border rounded-xl bg-card shadow-[var(--shadow-border)]">
              {saved.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link to="/product/$id" params={{ id: product.id }} className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {money(product.priceCents)}
                    </p>
                  </Link>
                  <Button size="sm" onClick={() => addToCart(product.id, 1)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-display text-xl">Orders</h2>
          {orders.length === 0 ? (
            <div className="mt-4 rounded-xl bg-card px-6 py-14 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-xl">You have no orders yet</p>
              <Button asChild className="mt-4">
                <Link to="/">Go to shop</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/receipt/$id"
                    params={{ id: order.id }}
                    className="block rounded-xl bg-card p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{order.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM d · h:mm a")} · {order.slot}
                        </p>
                      </div>
                      <Badge>{STATUS_LABEL[order.status]}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {order.items.map((item) => item.name).join(", ")}
                    </p>
                    <p className="mt-2 text-sm font-medium tabular-nums">{money(order.totalCents)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StorefrontShell>
  );
}
