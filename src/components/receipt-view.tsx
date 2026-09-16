import { format } from "date-fns";
import { Printer } from "lucide-react";
import { PAY_LABEL, type Order } from "@/lib/catalog";
import { money, TAX_RATE } from "@/lib/money";
import { useShop } from "@/lib/market-hooks";
import { Button } from "@/components/ui/button";

export function ReceiptView({ order }: { order: Order }) {
  const shop = useShop();
  const when = new Date(order.createdAt);
  const taxPct = `${Math.round(TAX_RATE * 1000) / 10}`;

  return (
    <div>
      <article className="receipt-ticket mx-auto max-w-sm bg-card text-card-foreground shadow-[var(--shadow-border)]">
        <div className="px-6 py-8 font-mono text-xs leading-relaxed">
          <header className="text-center">
            <p className="font-display text-2xl tracking-tight text-foreground italic">{shop.name}</p>
            <p className="mt-3 uppercase tracking-[0.14em]">{shop.street}</p>
            <p className="uppercase tracking-[0.14em]">{shop.city}</p>
            <p className="mt-2 tabular-nums">{shop.phone}</p>
          </header>

          <Dash />

          <div className="flex justify-between tabular-nums">
            <span>{format(when, "MM/dd/yyyy")}</span>
            <span>{format(when, "h:mm a")}</span>
          </div>
          <p className="mt-1">Ticket {order.number}</p>
          <p>{order.walkIn ? "Store sale" : order.customer.name}</p>
          {!order.walkIn && order.customer.phone !== "—" ? (
            <p className="text-muted-foreground">{order.customer.phone}</p>
          ) : null}

          <Dash />

          <ul className="space-y-2">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.name}`}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-2"
              >
                <span className="tabular-nums">{item.qty}</span>
                <span className="min-w-0">
                  <span className="block truncate">{item.name}</span>
                </span>
                <span className="tabular-nums">{money(item.priceCents * item.qty)}</span>
              </li>
            ))}
          </ul>

          <Dash />

          <dl className="space-y-1">
            <Row label="Subtotal" value={money(order.subtotalCents)} />
            {order.discountCents > 0 ? (
              <Row
                label={order.promoCode ? `Promo ${order.promoCode}` : "Discount"}
                value={`−${money(order.discountCents)}`}
              />
            ) : null}
            {order.deliveryCents > 0 ? <Row label="Delivery" value={money(order.deliveryCents)} /> : null}
            <Row label={`VAT ${taxPct}%`} value={money(order.taxCents)} />
            {order.tipCents > 0 ? <Row label="Tip" value={money(order.tipCents)} /> : null}
            <Row label="Total" value={money(order.totalCents)} strong />
          </dl>

          <Dash />

          <p className="uppercase tracking-[0.12em]">
            {order.payment ? PAY_LABEL[order.payment] : "Pay at the shop"}
          </p>
          {order.notes ? <p className="mt-2 text-muted-foreground">Note: {order.notes}</p> : null}

          <p className="mt-8 text-center uppercase tracking-[0.16em]">Thank you for shopping</p>
          <p className="mt-1 text-center uppercase tracking-[0.16em]">at {shop.name}</p>
          <p className="mt-3 text-center text-muted-foreground">{shop.hours}</p>

          <TicketBarcode value={order.number} />
          <p className="mt-2 text-center tabular-nums tracking-[0.28em]">{order.number.replace(/-/g, "")}</p>
        </div>
      </article>
      <div className="no-print mt-4 flex justify-center">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print receipt
        </Button>
      </div>
    </div>
  );
}

function Dash() {
  return <div className="my-4 border-t border-dashed border-foreground/25" />;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-semibold uppercase tracking-[0.12em]" : "uppercase tracking-[0.08em]"}>
        {label}
      </dt>
      <dd className={strong ? "text-sm font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

function TicketBarcode({ value }: { value: string }) {
  const units: Array<0 | 1 | 2 | 3> = [2, 0, 1, 0, 3];
  const seed = `*${value}*PAYNOTE*${value}*`;
  for (let i = 0; i < seed.length; i += 1) {
    const n = seed.charCodeAt(i);
    units.push((1 + (n & 1)) as 1 | 2, 0, (1 + ((n >> 1) & 1)) as 1 | 2, 0, (1 + ((n >> 2) & 1)) as 1 | 2, 0);
  }
  units.push(3, 0, 1, 0, 2);
  const width = ["w-px bg-transparent", "w-0.5 bg-foreground", "w-1 bg-foreground", "w-1.5 bg-foreground"] as const;
  return (
    <div className="mt-6 flex h-14 items-stretch justify-center overflow-hidden px-3" aria-hidden>
      {units.map((unit, i) => (
        <span key={i} className={width[unit]} />
      ))}
    </div>
  );
}
