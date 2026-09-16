import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Tag } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { StorefrontShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, isDeal } from "@/lib/catalog";
import { useLiveProducts, useShop } from "@/lib/market-hooks";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type Search = { aisle?: string; deals?: boolean; q?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    aisle: typeof s.aisle === "string" ? s.aisle : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    deals: s.deals === true || s.deals === "1" || s.deals === "true" ? true : undefined,
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const products = useLiveProducts();
  const shop = useShop();
  const [query, setQuery] = useState(search.q ?? "");

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (search.aisle && product.category !== search.aisle) return false;
      if (search.deals && !isDeal(product) && !product.dealLabel) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${product.name} ${product.subtitle} ${product.sku}`.toLowerCase().includes(q);
    });
  }, [products, query, search.aisle, search.deals]);

  const featured = products.filter((p) => p.featured);

  return (
    <StorefrontShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            {shop.city}
          </p>
          <h1 className="font-display mt-3 max-w-xl text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            {shop.tagline}
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">{shop.welcome}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button asChild>
              <a href="#aisles">See products</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/" search={{ deals: true }}>
                <Tag className="size-4" />
                Today’s promos
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {shop.street} · {shop.hours} · {shop.phone}
          </p>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-display text-2xl">Popular now</h2>
          <p className="mt-1 text-sm text-muted-foreground">Still available in the shop</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="aisles" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl">All products</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} item{filtered.length === 1 ? "" : "s"} in stock
            </p>
          </div>
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tomatoes, rice, eggs…"
              className="pl-10"
              aria-label="Search products"
            />
          </div>
        </div>
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          <Chip to="/" active={!search.aisle && !search.deals} label="All" />
          <Chip to="/" search={{ deals: true }} active={Boolean(search.deals)} label="Promos" />
          {CATEGORIES.map((aisle) => (
            <Chip
              key={aisle.id}
              to="/"
              search={{ aisle: aisle.id }}
              active={search.aisle === aisle.id}
              label={aisle.label}
            />
          ))}
        </div>
        {search.aisle ? (
          <p className="mb-4 max-w-xl text-sm text-muted-foreground">
            {CATEGORIES.find((c) => c.id === search.aisle)?.blurb}
          </p>
        ) : null}
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-card px-6 py-16 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-xl">Nothing in stock here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another aisle, or check back after staff add more stock.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </StorefrontShell>
  );
}

function Chip({
  to,
  search,
  active,
  label,
}: {
  to: "/";
  search?: Search;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {label}
      {active ? <ArrowRight className="ml-1.5 size-3.5" /> : null}
    </Link>
  );
}
