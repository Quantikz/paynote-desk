import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductThumb } from "@/components/product-still";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const products = useMarket((s) => s.products);
  const moves = useMarket((s) => s.moves);
  const adjustStock = useMarket((s) => s.adjustStock);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products
      .filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query))
      .slice()
      .sort((a, b) => a.stock - b.stock);
  }, [products, q]);

  function receive(id: string) {
    const raw = draft[id] ?? "12";
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Enter a quantity.");
      return;
    }
    adjustStock(id, Math.trunc(delta), delta > 0 ? "Receive" : "Adjust");
    toast.success(delta > 0 ? "Received. Shop stock is updating." : "Adjusted. Shop stock is updating.");
    setDraft((s) => ({ ...s, [id]: "" }));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Inventory</p>
        <h1 className="font-display text-4xl">Stock</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add stock here. The shop shows the new quantity at once.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a product"
          className="pl-10"
        />
      </div>
      <div className="space-y-2">
        {rows.map((product) => {
          const low = product.stock <= product.reorderAt;
          return (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ProductThumb product={product} className="size-12 rounded-md" />
                <div className="min-w-0">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.sku} · reorder {product.reorderAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {low ? <Badge variant={product.stock === 0 ? "danger" : "warn"}>Low</Badge> : null}
                <span className="w-16 text-right text-lg tabular-nums">{product.stock}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  className="w-24"
                  inputMode="numeric"
                  placeholder="+12"
                  value={draft[product.id] ?? ""}
                  onChange={(e) => setDraft((s) => ({ ...s, [product.id]: e.target.value }))}
                />
                <Button variant="outline" onClick={() => receive(product.id)}>
                  Apply
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <section>
        <h2 className="font-display mb-3 text-xl">Recent moves</h2>
        {moves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No adjustments yet this session.</p>
        ) : (
          <ul className="space-y-2">
            {moves.slice(0, 16).map((move) => {
              const product = products.find((p) => p.id === move.productId);
              return (
                <li
                  key={move.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 text-sm shadow-[var(--shadow-border)]"
                >
                  <span>
                    <span className="font-medium">{product?.name ?? move.productId}</span>
                    <span className="block text-muted-foreground">
                      {move.reason} · {format(new Date(move.at), "MMM d, h:mm a")}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {move.delta > 0 ? "+" : ""}
                    {move.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
