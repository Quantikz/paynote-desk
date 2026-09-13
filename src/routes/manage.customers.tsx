import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const orders = useMarket((s) => s.orders);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; email: string; phone: string; spend: number; count: number; last: string }
    >();
    for (const order of orders) {
      if (order.walkIn || order.status === "cancelled") continue;
      const key = order.customer.email || order.customer.phone || order.customer.name;
      const cur = map.get(key) ?? {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        spend: 0,
        count: 0,
        last: order.createdAt,
      };
      cur.spend += order.totalCents;
      cur.count += 1;
      if (order.createdAt > cur.last) cur.last = order.createdAt;
      map.set(key, cur);
    }
    const query = q.trim().toLowerCase();
    return [...map.values()]
      .filter((row) =>
        query
          ? `${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(query)
          : true,
      )
      .sort((a, b) => b.spend - a.spend);
  }, [orders, q]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">People</p>
        <h1 className="font-display text-4xl">Customers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Built from shop orders. Counter sales are not listed here.
        </p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or email" />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customer notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.email + row.phone}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {row.email} · {row.phone}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular-nums">{money(row.spend)}</p>
                <p className="text-muted-foreground">
                  {row.count} notes · {format(new Date(row.last), "MMM d")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Need a packing list?{" "}
        <Link to="/manage/run" className="underline">
        Open today’s packing list
        </Link>
        .
      </p>
    </div>
  );
}
