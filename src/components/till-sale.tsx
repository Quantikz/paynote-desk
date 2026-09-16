import { useMemo, useState } from "react";
import { toast } from "sonner";
import { holdStock } from "@/components/hydrate";
import { QtyStepper } from "@/components/qty-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartLine, PayMethod, Product } from "@/lib/catalog";
import { TAX_RATE, money } from "@/lib/money";
import { isOnline } from "@/lib/offline";
import { useMarket } from "@/lib/store";

export function TillSale({ onSold }: { onSold?: () => void }) {
  const products = useMarket((s) => s.products);
  const ringUp = useMarket((s) => s.ringUp);
  const [q, setQ] = useState("");
  const [ticket, setTicket] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<PayMethod>("cash");

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products
      .filter((p) => p.stock > 0)
      .filter((p) =>
        query ? `${p.name} ${p.sku}`.toLowerCase().includes(query) : true,
      )
      .slice(0, query ? 16 : 12);
  }, [products, q]);

  const lines = ticket
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return null;
      return { product, qty: line.qty, lineCents: product.priceCents * line.qty };
    })
    .filter((row): row is { product: Product; qty: number; lineCents: number } => row !== null);
  const subtotal = lines.reduce((n, line) => n + line.lineCents, 0);
  const total = subtotal + Math.round(subtotal * TAX_RATE);

  function add(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setTicket((current) => {
      const existing = current.find((line) => line.productId === productId);
      const qty = (existing?.qty ?? 0) + 1;
      if (qty > product.stock) return current;
      if (!existing) return [...current, { productId, qty: 1 }];
      return current.map((line) =>
        line.productId === productId ? { ...line, qty } : line,
      );
    });
  }

  function setQty(productId: string, qty: number) {
    setTicket((current) =>
      qty <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) =>
            line.productId === productId ? { ...line, qty } : line,
          ),
    );
  }

  async function charge() {
    if (ticket.length === 0) {
      toast.error("No items on this sale.");
      return;
    }
    const result = ringUp(ticket, {
      fulfillment: "pickup",
      slot: "Store · now",
      name: "Store sale",
      phone: "—",
      email: "counter@paynote.ng",
      tipCents: 0,
      walkIn: true,
      status: "delivered",
      payment: tender,
    });
    if (result.error || !result.order) {
      toast.error(result.error ?? "Sale did not go through.");
      return;
    }
    if (isOnline()) {
      try {
        await holdStock(result.order.items.map((item) => ({ productId: item.productId, qty: item.qty })));
      } catch {
        /* local stock already moved */
      }
    }
    toast.success(`Recorded ${result.order.number} · ${money(result.order.totalCents)}`);
    setTicket([]);
    setQ("");
    onSold?.();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search product or SKU"
        />
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {matches.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => add(product.id)}
                className="w-full rounded-xl bg-card p-3 text-left shadow-[var(--shadow-border)]"
              >
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {money(product.priceCents)} · {product.stock} left
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-xl bg-secondary/40 p-5">
        <h2 className="font-display text-xl">This sale</h2>
        {lines.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Tap a product to add it.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.product.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{line.product.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {money(line.lineCents)}
                  </p>
                </div>
                <QtyStepper
                  value={line.qty}
                  max={line.product.stock}
                  onChange={(qty) => setQty(line.product.id, qty)}
                  className="h-9"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["cash", "transfer", "card"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTender(id)}
              className={
                tender === id
                  ? "h-11 rounded-md bg-primary text-sm text-primary-foreground capitalize"
                  : "h-11 rounded-md bg-secondary text-sm capitalize"
              }
            >
              {id}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">VAT 7.5%</span>
          <span className="tabular-nums">{money(Math.round(subtotal * TAX_RATE))}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium">
          <span>Total</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
        <Button className="mt-5 w-full" size="lg" onClick={() => void charge()} disabled={lines.length === 0}>
          Record sale
        </Button>
      </aside>
    </div>
  );
}
