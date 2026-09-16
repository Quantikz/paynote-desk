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
import { Boxes, Percent, Receipt, TrendingUp, Wallet, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isRecordedSale, orderCogs, orderProfit, saleKind } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const orders = useMarket((s) => s.orders);
  const products = useMarket((s) => s.products);
  const [chartOn, setChartOn] = useState(false);
  useEffect(() => setChartOn(true), []);

  const live = orders.filter(isRecordedSale);
  const todayIso = new Date().toISOString().slice(0, 10);
  const today = live.filter((order) => order.createdAt.slice(0, 10) === todayIso);
  const revenue = live.reduce((n, order) => n + order.totalCents, 0);
  const cost = live.reduce((n, order) => n + orderCogs(order), 0);
  const profit = live.reduce((n, order) => n + orderProfit(order), 0);
  const vat = live.reduce((n, order) => n + order.taxCents, 0);
  const goods = live.reduce((n, order) => n + order.subtotalCents - order.discountCents, 0);
  const margin = goods > 0 ? Math.round((profit / goods) * 1000) / 10 : 0;
  const todayProfit = today.reduce((n, order) => n + orderProfit(order), 0);
  const onHand = products.filter((product) => product.active);
  const stockCost = onHand.reduce((n, product) => n + product.stock * (product.costCents || 0), 0);
  const stockRetail = onHand.reduce((n, product) => n + product.stock * product.priceCents, 0);
  const low = onHand.filter((product) => product.stock <= product.reorderAt);
  const units = onHand.reduce((n, product) => n + product.stock, 0);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map((day) => {
      const slice = live.filter((order) => order.createdAt.slice(0, 10) === day);
      return {
        day: format(parseISO(`${day}T12:00:00`), "EEE"),
        sales: slice.reduce((n, order) => n + order.totalCents, 0) / 100,
        cost: slice.reduce((n, order) => n + orderCogs(order), 0) / 100,
        profit: slice.reduce((n, order) => n + orderProfit(order), 0) / 100,
      };
    });
  }, [live]);

  const byProduct = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; qty: number; sales: number; cost: number; profit: number }
    >();
    for (const order of live) {
      for (const item of order.items) {
        const product = products.find((row) => row.id === item.productId);
        const unitCost = item.costCents ?? product?.costCents ?? 0;
        const cur = counts.get(item.productId) ?? {
          name: item.name,
          qty: 0,
          sales: 0,
          cost: 0,
          profit: 0,
        };
        cur.qty += item.qty;
        cur.sales += item.priceCents * item.qty;
        cur.cost += unitCost * item.qty;
        cur.profit += (item.priceCents - unitCost) * item.qty;
        counts.set(item.productId, cur);
      }
    }
    return [...counts.values()].sort((a, b) => b.profit - a.profit).slice(0, 8);
  }, [live, products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Store</p>
          <h1 className="font-display text-4xl">Performance</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Profit is selling price minus buying cost. Stock value is what you paid for what is still on the shelf.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/manage/catalog">Set buying cost</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} label="Sales" value={money(revenue)} hint={`${live.length} recorded`} />
        <Stat icon={Receipt} label="Cost of stock sold" value={money(cost)} hint="Buying cost of what left the shop" />
        <Stat icon={TrendingUp} label="Gross profit" value={money(profit)} hint={`Today ${money(todayProfit)}`} />
        <Stat icon={Percent} label="Margin" value={`${margin}%`} hint={`VAT ${money(vat)}`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={Warehouse}
          label="Stock on hand at cost"
          value={money(stockCost)}
          hint={`${units} units still in the shop`}
        />
        <Stat
          icon={Boxes}
          label="Stock on hand at price"
          value={money(stockRetail)}
          hint="If everything on the shelf sold today"
        />
        <Stat
          icon={Receipt}
          label="Need restock"
          value={String(low.length)}
          hint={low.length ? low.slice(0, 3).map((p) => p.name).join(", ") : "Nothing is low"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seven days</CardTitle>
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
                  formatter={(value, name) =>
                    typeof value === "number"
                      ? [`₦${value.toLocaleString("en-NG")}`, String(name)]
                      : [value, String(name)]
                  }
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Bar dataKey="sales" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg bg-muted" />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit by product</CardTitle>
          </CardHeader>
          <CardContent>
            {byProduct.length === 0 ? (
              <p className="text-sm text-muted-foreground">Record a sale to see profit.</p>
            ) : (
              <ul className="space-y-3">
                {byProduct.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="block font-medium">{row.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {row.qty} sold · cost {money(row.cost)}
                      </span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block font-medium">{money(row.profit)}</span>
                      <span className="text-xs text-muted-foreground">{money(row.sales)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today’s profit</CardTitle>
          </CardHeader>
          <CardContent>
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded sales today.</p>
            ) : (
              <ul className="space-y-3">
                {today.slice(0, 8).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{order.number}</span>
                      <span className="block text-muted-foreground">
                        {saleKind(order) === "store" ? "Store" : "Scanned"} · cost {money(orderCogs(order))}
                      </span>
                    </span>
                    <span className="tabular-nums">{money(orderProfit(order))}</span>
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

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" strokeWidth={1.75} />
          {label}
        </p>
        <p className="font-display text-3xl tabular-nums">{value}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
