import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABEL } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useShop } from "@/lib/market-hooks";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/")({
  component: ManageHome,
});

function ManageHome() {
  const orders = useMarket((s) => s.orders);
  const products = useMarket((s) => s.products);
  const resetDemo = useMarket((s) => s.resetDemo);
  const shop = useShop();
  const [chartOn, setChartOn] = useState(false);
  useEffect(() => setChartOn(true), []);

  const live = orders.filter((o) => o.status !== "cancelled");
  const todayIso = "2026-09-13";
  const todayOrders = live.filter((o) => o.createdAt.slice(0, 10) === todayIso);
  const revenue = live.reduce((n, o) => n + o.totalCents, 0);
  const todayRev = todayOrders.reduce((n, o) => n + o.totalCents, 0);
  const low = products.filter((p) => p.active && p.stock <= p.reorderAt);
  const open = orders.filter((o) => ["placed", "packing", "ready", "out"].includes(o.status));

  const chart = useMemo(() => {
    const days = ["09", "10", "11", "12", "13"].map((d) => `2026-09-${d}`);
    return days.map((day) => {
      const slice = live.filter((o) => o.createdAt.slice(0, 10) === day);
      return {
        day: format(parseISO(`${day}T12:00:00`), "EEE"),
        sales: slice.reduce((n, o) => n + o.totalCents, 0) / 100,
        orders: slice.length,
      };
    });
  }, [live]);

  const top = useMemo(() => {
    const counts = new Map<string, { name: string; qty: number; cents: number }>();
    for (const order of live) {
      for (const item of order.items) {
        const cur = counts.get(item.productId) ?? {
          name: item.name,
          qty: 0,
          cents: 0,
        };
        cur.qty += item.qty;
        cur.cents += item.qty * item.priceCents;
        counts.set(item.productId, cur);
      }
    }
    return [...counts.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
  }, [live]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{shop.city}</p>
          <h1 className="font-display text-4xl">Staff desk</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/manage/scan">Scan a code</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/manage/run">Packing list</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/manage/company">Company</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetDemo();
              void import("@/components/hydrate").then(({ pushShelf }) => pushShelf());
            }}
          >
            Reset demo shop
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="All sales" value={money(revenue)} />
        <Stat label="Today" value={money(todayRev)} hint={`${todayOrders.length} orders`} />
        <Stat label="Open orders" value={String(open.length)} />
        <Stat label="Low stock" value={String(low.length)} hint="Need to restock" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales, five days</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {chartOn ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => `₦${Math.round(Number(v) / 1000)}k`}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? [`₦${value.toLocaleString("en-NG")}`, "Sales"] : [value, "Sales"]
                    }
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Bar dataKey="sales" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-lg bg-muted" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {top.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="block font-medium">{row.name}</span>
                    <span className="text-muted-foreground tabular-nums">{row.qty} sold</span>
                  </span>
                  <span className="tabular-nums">{money(row.cents)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Queue</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/manage/orders">Open</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open orders.</p>
            ) : (
              <ul className="space-y-3">
                {open.slice(0, 6).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{order.number}</span>
                      <span className="block text-muted-foreground">
                        {STATUS_LABEL[order.status]} · {order.customer.name}
                      </span>
                    </span>
                    <span className="tabular-nums">{money(order.totalCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Need restock</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/manage/inventory">Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground">Floor is covered.</p>
            ) : (
              <ul className="space-y-3">
                {low.slice(0, 6).map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{product.name}</span>
                      <span className="block text-muted-foreground">{product.sku}</span>
                    </span>
                    <span className="tabular-nums">{product.stock} / {product.reorderAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="font-display text-3xl tabular-nums">{value}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
