import { format } from "date-fns";
import { STATUS_LABEL, PAY_LABEL, type Order } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useShop } from "@/lib/market-hooks";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function ReceiptView({ order }: { order: Order }) {
  const shop = useShop();
  return (
    <article className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <p className="text-[11px] tracking-[0.2em] uppercase opacity-80">{shop.name}</p>
        <h1 className="font-display mt-1 text-3xl italic">{order.number}</h1>
        <p className="mt-2 text-sm opacity-80">
          {format(new Date(order.createdAt), "EEE, MMM d · h:mm a")}
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{STATUS_LABEL[order.status]}</Badge>
          <Badge variant="secondary">
            {order.walkIn ? "Walk-in" : "Collect at shop"}
          </Badge>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
            {order.customer.email ? (
              <p className="text-muted-foreground">{order.customer.email}</p>
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground">Collect at</p>
            <p className="font-medium">
              {shop.name}, {shop.street}
            </p>
            <p className="text-muted-foreground">{shop.city}</p>
          </div>
        </div>
        <Separator />
        <ul className="receipt-paper space-y-3">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.name}`} className="flex justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">{item.name}</span>
                <span className="block text-muted-foreground">
                  {item.qty} × {money(item.priceCents)} / {item.unit}
                </span>
              </span>
              <span className="tabular-nums">{money(item.priceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={money(order.subtotalCents)} />
          {order.discountCents > 0 ? (
            <Row
              label={order.promoCode ? `Promo ${order.promoCode}` : "Discount"}
              value={`−${money(order.discountCents)}`}
            />
          ) : null}
          <Row label="VAT (7.5%)" value={money(order.taxCents)} />
          {order.tipCents > 0 ? <Row label="Tip" value={money(order.tipCents)} /> : null}
          {order.payment ? <Row label="Paid by" value={PAY_LABEL[order.payment]} /> : (
            <Row label="Payment" value="Pay at the shop" />
          )}
          <Row label="Total" value={money(order.totalCents)} strong />
        </dl>
        {order.notes ? (
          <p className="text-sm text-muted-foreground">Note: {order.notes}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {shop.name} · {shop.street} · {shop.city}
        </p>
      </div>
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-base font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
