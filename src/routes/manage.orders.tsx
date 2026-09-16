import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { ReceiptView } from "@/components/receipt-view";
import { TillSale } from "@/components/till-sale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { isRecordedSale, PAY_LABEL, saleKind, type Order } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useOnline } from "@/lib/offline";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

type OrdersSearch = { sale?: boolean };

export const Route = createFileRoute("/manage/orders")({
  validateSearch: (s: Record<string, unknown>): OrdersSearch => {
    const sale = s.sale === true || s.sale === "1" || s.sale === "true";
    return sale ? { sale: true } : {};
  },
  component: ManageOrdersPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "scan", label: "Scanned" },
  { id: "store", label: "Store" },
  { id: "today", label: "Today" },
] as const;

function ManageOrdersPage() {
  const orders = useMarket((s) => s.orders);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/manage/orders" });
  const online = useOnline();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState<Order | null>(null);
  const selling = Boolean(search.sale);

  const recorded = useMemo(() => orders.filter(isRecordedSale), [orders]);
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    return recorded.filter((order) => {
      if (filter === "scan") return saleKind(order) === "scan";
      if (filter === "store") return saleKind(order) === "store";
      if (filter === "today") return order.createdAt.slice(0, 10) === today;
      return true;
    });
  }, [recorded, filter, today]);

  function setSelling(next: boolean) {
    void navigate({ search: next ? { sale: true } : {}, replace: true });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Sales book</p>
          <h1 className="font-display text-4xl">Orders</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Only scanned tickets and store sales. Kept on this phone, so the book still works without internet.
            {!online ? " You are offline — new records stay here until you are back." : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/manage/scan">Scan ticket</Link>
          </Button>
          <Button onClick={() => setSelling(true)}>New store sale</Button>
        </div>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-11 shrink-0 rounded-full px-4 text-sm",
              filter === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-14 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-xl">No sales recorded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan a customer code, or tap a product for a store sale.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((order) => {
            const kind = saleKind(order);
            return (
              <li
                key={order.id}
                className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" className="text-left" onClick={() => setOpen(order)}>
                    <p className="font-medium">{order.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {kind === "store" ? "Store sale" : order.customer.name} ·{" "}
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
                    </p>
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={kind === "store" ? "secondary" : "default"}>
                      {kind === "store" ? "Store" : "Scanned"}
                    </Badge>
                    <p className="text-sm tabular-nums">{money(order.totalCents)}</p>
                    {order.payment ? (
                      <p className="text-xs text-muted-foreground">{PAY_LABEL[order.payment]}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(order)}>
                    Receipt
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="no-print px-5 pt-5">
            <DialogTitle>Note</DialogTitle>
          </DialogHeader>
          {open ? (
            <div className="p-5 pt-0">
              <ReceiptView order={open} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={selling} onOpenChange={setSelling}>
        <SheetContent side="bottom" className="overflow-y-auto p-5 pt-10">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Counter</p>
          <h2 className="font-display text-3xl">Store sale</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            What they bought in the shop. Recorded on this phone even if you are offline.
          </p>
          <TillSale onSold={() => setSelling(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
