import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductThumb } from "@/components/product-still";
import { categoryLabel } from "@/lib/catalog";
import { useLiveProducts } from "@/lib/market-hooks";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const products = useLiveProducts();
  const addToCart = useMarket((s) => s.addToCart);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products.slice(0, 8);
    return products
      .filter((p) =>
        [p.name, p.subtitle, p.sku, categoryLabel(p.category)]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 12);
  }, [products, q]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQ("");
      }}
    >
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Search the shop</DialogTitle>
          <DialogDescription>Only items we have in stock.</DialogDescription>
        </DialogHeader>
        <div className="px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tomatoes, rice, eggs…"
              className="pl-9"
            />
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto px-2 pb-3">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              We do not have that in stock.
            </li>
          ) : (
            results.map((product) => (
              <li key={product.id} className="flex items-center gap-1 rounded-lg hover:bg-muted">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                  onClick={() => {
                    onOpenChange(false);
                    void navigate({ to: "/product/$id", params: { id: product.id } });
                  }}
                >
                  <ProductThumb product={product} className="size-10 rounded-md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabel(product.category)} · {money(product.priceCents)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="h-11 px-3 text-xs font-medium text-primary"
                  onClick={() => {
                    addToCart(product.id, 1);
                    onOpenChange(false);
                  }}
                >
                  Add
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
