import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { QrScanner } from "@/components/qr-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAY_LABEL, STATUS_LABEL, type Order, type PayMethod } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";
import { decodeTicket, findOrder } from "@/lib/ticket";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/scan")({
  component: ScanPage,
});

function ScanPage() {
  const orders = useMarket((s) => s.orders);
  const collectOrder = useMarket((s) => s.collectOrder);
  const acceptTicket = useMarket((s) => s.acceptTicket);
  const [loaded, setLoaded] = useState<Order | null>(null);
  const [typed, setTyped] = useState("");
  const [pay, setPay] = useState<PayMethod>("cash");

  const onRead = useCallback(
    (value: string) => {
      const decoded = decodeTicket(value);
      if (decoded.order) {
        setLoaded(acceptTicket(decoded.order));
        return;
      }
      const found = findOrder(orders, value);
      if (found) setLoaded(found);
    },
    [acceptTicket, orders],
  );

  const order = loaded;

  function lookup() {
    if (!typed.trim()) {
      toast.error("Scan the code, or type the order number.");
      return;
    }
    const decoded = decodeTicket(typed.trim());
    if (decoded.order) {
      setLoaded(acceptTicket(decoded.order));
      return;
    }
    const found = findOrder(orders, typed.trim());
    if (!found) {
      toast.error("That code has no order on it.");
      return;
    }
    setLoaded(found);
  }

  function collect() {
    if (!order) return;
    acceptTicket(order);
    const result = collectOrder(order.id, pay);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Collected ${order.number} · ${money(order.totalCents)} · ${PAY_LABEL[pay]}`);
    setLoaded(null);
    setTyped("");
  }

  const fromCode = useMemo(() => Boolean(order), [order]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Secure desk</p>
          <h1 className="text-3xl font-semibold tracking-tight">Scan customer code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The code holds the full order. It works even if the shop is offline.
          </p>
        </div>
        <QrScanner onRead={onRead} paused={Boolean(order)} onReset={() => setLoaded(null)} />
        <div className="flex gap-2">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Paste JSON or type PN-1836"
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
          />
          <Button variant="outline" onClick={lookup}>
            Load
          </Button>
        </div>
      </div>

      <aside className="h-fit border border-border bg-card p-5">
        {!fromCode ? (
          <p className="text-sm text-muted-foreground">Waiting for a code.</p>
        ) : !order ? (
          <p className="text-sm text-muted-foreground">No order in that code.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-semibold">{order.number}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customer.name} · {order.customer.phone}
                </p>
              </div>
              <Badge>{STATUS_LABEL[order.status]}</Badge>
            </div>
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3">
                  <span>
                    {item.qty} × {item.name}
                    <span className="block text-xs text-muted-foreground">{item.unit}</span>
                  </span>
                  <span className="tabular-nums">{money(item.priceCents * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Promo</dt>
                  <dd className="tabular-nums">−{money(order.discountCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT</dt>
                <dd className="tabular-nums">{money(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Collect</dt>
                <dd className="tabular-nums">{money(order.totalCents)}</dd>
              </div>
            </dl>
            {order.status === "delivered" ? (
              <p className="text-sm text-muted-foreground">Already collected and paid.</p>
            ) : order.status === "cancelled" ? (
              <p className="text-sm text-destructive">This order was cancelled.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "transfer", "card"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPay(id)}
                      className={cn(
                        "h-11 text-sm capitalize",
                        pay === id ? "bg-primary text-primary-foreground" : "bg-secondary",
                      )}
                    >
                      {id}
                    </button>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={collect}>
                  Pack, collect {money(order.totalCents)}
                </Button>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
