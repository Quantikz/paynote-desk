import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { ProductStill } from "@/components/product-still";
import { QtyStepper } from "@/components/qty-stepper";
import { StorefrontShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { categoryLabel, isDeal, STORE } from "@/lib/catalog";
import { useLiveProducts } from "@/lib/market-hooks";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const product = useMarket((s) => s.products.find((item) => item.id === id));
  const products = useLiveProducts();
  const addToCart = useMarket((s) => s.addToCart);
  const saved = useMarket((s) => s.saved.includes(id));
  const toggleSaved = useMarket((s) => s.toggleSaved);
  const [qty, setQty] = useState(1);

  if (!product || !product.active || product.stock <= 0) {
    return (
      <StorefrontShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">This item is not for sale</p>
          <p className="mt-2 text-muted-foreground">It is off the shelf or sold out.</p>
          <Button asChild className="mt-6">
            <Link to="/">Back to shop</Link>
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);
  const out = product.stock <= 0;

  return (
    <StorefrontShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-12">
        <ProductStill product={product} className="min-h-72 rounded-xl sm:min-h-96" />
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              {categoryLabel(product.category)} · {product.sku}
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDeal(product) || product.dealLabel ? (
              <Badge variant="deal">{product.dealLabel ?? "Deal"}</Badge>
            ) : null}
            {product.origin ? <Badge variant="secondary">{product.origin}</Badge> : null}
            {product.stock <= product.reorderAt ? (
              <Badge variant={out ? "danger" : "warn"}>
              {out ? "Sold out" : `${product.stock} left`}
              </Badge>
            ) : (
              <Badge variant="outline">{product.stock} in stock</Badge>
            )}
          </div>
          <div>
            <p className="text-3xl font-medium tabular-nums">
              {money(product.priceCents)}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                / {product.unit}
              </span>
            </p>
            {product.compareAtCents ? (
              <p className="text-sm text-muted-foreground line-through tabular-nums">
                {money(product.compareAtCents)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} min={1} max={Math.max(1, product.stock)} onChange={setQty} />
            <Button
              size="lg"
              disabled={out}
              onClick={() => addToCart(product.id, qty)}
              className="min-w-40"
            >
              {out ? "Sold out" : "Add to cart"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleSaved(product.id)}
              aria-label="Save"
            >
              <Heart className={cn("size-4", saved && "fill-primary text-primary")} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Packed at {STORE.street}, {STORE.city}. We deliver in Lagos, or you can pick up from the shop.
          </p>
        </div>
      </div>
      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="font-display mb-4 text-2xl">People also buy</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </StorefrontShell>
  );
}
