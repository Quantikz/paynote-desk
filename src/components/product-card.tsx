import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductStill } from "@/components/product-still";
import { isDeal, type Product } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useMarket((s) => s.addToCart);
  const saved = useMarket((s) => s.saved.includes(product.id));
  const toggleSaved = useMarket((s) => s.toggleSaved);
  const out = product.stock <= 0;
  const low = !out && product.stock <= product.reorderAt;

  return (
    <article className="group flex flex-col rounded-xl bg-card p-2 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-border-hover)]">
      <div className="relative">
        <Link to="/product/$id" params={{ id: product.id }} className="block" tabIndex={-1} aria-hidden="true">
          <ProductStill product={product} className="aspect-[4/3] min-h-0 h-auto rounded-lg" />
        </Link>
        <button
          type="button"
          onClick={() => toggleSaved(product.id)}
          className="absolute top-2 right-2 grid size-11 place-items-center rounded-md bg-card/80 text-foreground backdrop-blur-sm"
          aria-label={saved ? "Remove from saved" : "Save for later"}
        >
          <Heart className={cn("size-4", saved && "fill-primary text-primary")} strokeWidth={1.75} />
        </button>
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isDeal(product) || product.dealLabel ? (
            <Badge variant="deal">{product.dealLabel ?? "Deal"}</Badge>
          ) : null}
          {out ? <Badge variant="danger">Sold out</Badge> : null}
          {low ? <Badge variant="warn">Only {product.stock} left</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-2 pt-3 pb-2">
        <div className="flex-1">
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="font-medium leading-snug hover:underline"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{product.subtitle}</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-medium tabular-nums">
              {money(product.priceCents)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {product.unit}
              </span>
            </p>
            {product.compareAtCents ? (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {money(product.compareAtCents)}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            disabled={out}
            onClick={() => addToCart(product.id, 1)}
          >
            {out ? "Sold out" : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}
