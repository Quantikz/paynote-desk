import { createFileRoute, Link } from "@tanstack/react-router";
import { OrderQr } from "@/components/order-qr";
import { ReceiptView } from "@/components/receipt-view";
import { StorefrontShell } from "@/components/shell";
import { TicketActions } from "@/components/ticket-actions";
import { Button } from "@/components/ui/button";
import { STORE, STATUS_LABEL } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/receipt/$id")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { id } = Route.useParams();
  const hydrated = useMarket((s) => s.hydrated);
  const order = useMarket((s) => s.orders.find((item) => item.id === id));

  if (!hydrated && !order) {
    return (
      <StorefrontShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center text-muted-foreground">
          Loading your ticket…
        </div>
      </StorefrontShell>
    );
  }

  if (!order) {
    return (
      <StorefrontShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-3xl">We cannot find this order</h1>
          <Button asChild className="mt-6">
            <Link to="/orders">My orders</Link>
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  const waiting = !["delivered", "cancelled"].includes(order.status);

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-xl px-4 py-8">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Collection ticket</p>
        <h1 className="font-display mt-1 text-4xl">
          {waiting ? "Show this code at the shop" : STATUS_LABEL[order.status]}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {waiting
            ? `The code is the full order as JSON — name, phone, every item, prices, VAT, and total. The desk can pack and collect ${money(order.totalCents)} even if the shop computers are offline. Bring it to ${STORE.street}.`
            : `Collected at ${STORE.name}.`}
        </p>

        {waiting ? (
          <div className="mt-6 rounded-xl bg-card px-5 py-6 text-center shadow-[var(--shadow-border)]">
            <OrderQr order={order} />
            <p className="font-display mt-4 text-3xl tracking-wide">{order.number}</p>
            <p className="mt-1 text-sm text-muted-foreground">Pay at the shop. This code is the order.</p>
            <div className="mt-5 text-left">
              <TicketActions order={order} />
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <ReceiptView order={order} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/orders">My orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Keep shopping</Link>
          </Button>
        </div>
      </div>
    </StorefrontShell>
  );
}
