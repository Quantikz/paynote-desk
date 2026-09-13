import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES, categoryLabel } from "@/lib/catalog";
import { ProductThumb } from "@/components/product-still";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/run")({
  component: RunPage,
});

function RunPage() {
  const orders = useMarket((s) => s.orders);
  const products = useMarket((s) => s.products);
  const setOrderStatus = useMarket((s) => s.setOrderStatus);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const open = useMemo(
    () => orders.filter((o) => ["placed", "packing"].includes(o.status)),
    [orders],
  );

  const picks = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; name: string; unit: string; qty: number; aisle: string }
    >();
    for (const order of open) {
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        const cur = map.get(item.productId) ?? {
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          qty: 0,
          aisle: product?.category ?? "pantry",
        };
        cur.qty += item.qty;
        map.set(item.productId, cur);
      }
    }
    return [...map.values()].sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name));
  }, [open, products]);

  const grouped = CATEGORIES.map((aisle) => ({
    ...aisle,
    items: picks.filter((p) => p.aisle === aisle.id),
  })).filter((g) => g.items.length > 0);

  const remaining = picks.filter((p) => !done[p.productId]).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Packing</p>
          <h1 className="font-display text-4xl">Today’s packing list</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {open.length} orders to pack · {remaining} items still to pick
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            open.forEach((order) => {
              if (order.status === "placed") setOrderStatus(order.id, "packing");
            });
          }}
        >
          Start all as packing
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-14 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-xl">Nothing to pack</p>
          <p className="mt-1 text-sm text-muted-foreground">No orders waiting.</p>
        </div>
      ) : (
        grouped.map((aisle) => (
          <section key={aisle.id}>
            <h2 className="font-display mb-3 text-xl">{aisle.label}</h2>
            <ul className="space-y-2">
              {aisle.items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const checked = Boolean(done[item.productId]);
                return (
                  <li key={item.productId}>
                    <button
                      type="button"
                      onClick={() =>
                        setDone((s) => ({ ...s, [item.productId]: !s[item.productId] }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl bg-card px-3 py-3 text-left shadow-[var(--shadow-border)]",
                        checked && "opacity-50",
                      )}
                    >
                      {product ? <ProductThumb product={product} /> : null}
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-medium", checked && "line-through")}>
                          {item.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {categoryLabel(item.aisle)} · {item.unit}
                        </span>
                      </span>
                      <Badge variant={checked ? "secondary" : "deal"}>{item.qty}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
