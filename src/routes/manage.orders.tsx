import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ReceiptView } from "@/components/receipt-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_FLOW, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/orders")({
  component: ManageOrdersPage,
});

const FILTERS: Array<{ id: "all" | OrderStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "placed", label: "Waiting" },
  { id: "packing", label: "Packing" },
  { id: "ready", label: "Ready" },
  { id: "delivered", label: "Collected" },
  { id: "cancelled", label: "Cancelled" },
];

function ManageOrdersPage() {
  const orders = useMarket((s) => s.orders);
  const setOrderStatus = useMarket((s) => s.setOrderStatus);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState<Order | null>(null);

  const rows = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  function advance(order: Order) {
    if (order.status === "cancelled" || order.status === "delivered") return;
    const i = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[i + 1];
    if (!next) return;
    setOrderStatus(order.id, next);
    toast.success(`${order.number} → ${STATUS_LABEL[next]}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Fulfillment</p>
        <h1 className="font-display text-4xl">Order queue</h1>
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
      <ul className="space-y-3">
        {rows.map((order) => (
          <li
            key={order.id}
            className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="text-left" onClick={() => setOpen(order)}>
                <p className="font-medium">{order.number}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customer.name} · {format(new Date(order.createdAt), "MMM d, h:mm a")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.items.length} lines · {order.slot}
                </p>
              </button>
              <div className="flex flex-col items-end gap-2">
                <Badge>{STATUS_LABEL[order.status]}</Badge>
                <p className="text-sm tabular-nums">{money(order.totalCents)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.status !== "delivered" && order.status !== "cancelled" ? (
                <Button size="sm" onClick={() => advance(order)}>
                  Mark {STATUS_LABEL[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] ?? "delivered"]}
                </Button>
              ) : null}
              {order.status !== "cancelled" && order.status !== "delivered" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOrderStatus(order.id, "cancelled");
                    toast.message(`${order.number} cancelled · stock returned`);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setOpen(order)}>
                Receipt
              </Button>
            </div>
          </li>
        ))}
      </ul>

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
    </div>
  );
}
