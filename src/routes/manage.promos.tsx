import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Promo } from "@/lib/catalog";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/promos")({
  component: PromosPage,
});

function PromosPage() {
  const promos = useMarket((s) => s.promos);
  const upsertPromo = useMarket((s) => s.upsertPromo);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [percent, setPercent] = useState("10");

  function add() {
    if (!code.trim()) {
      toast.error("Need a code.");
      return;
    }
    upsertPromo({
      code: code.trim().toUpperCase(),
      label: label.trim() || `${percent}% off`,
      percentOff: Number(percent) || undefined,
      active: true,
    });
    toast.success("Promo saved. Shop checkout will use it.");
    setCode("");
    setLabel("");
  }

  function toggle(promo: Promo) {
    upsertPromo({ ...promo, active: !promo.active });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Promotions</p>
        <h1 className="font-display text-4xl">Codes</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Shoppers enter these at checkout. FRESH10, NOTE5, and MARKET15 ship with the demo.
        </p>
      </div>
      <form
        className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            className="mt-1.5"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SPRING10"
          />
        </div>
        <div>
          <Label htmlFor="pct">Percent off</Label>
          <Input
            id="pct"
            className="mt-1.5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            className="mt-1.5"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Weekend produce"
          />
        </div>
        <Button type="submit" className="sm:col-span-2">
          Add promo
        </Button>
      </form>
      <ul className="space-y-2">
        {promos.map((promo) => (
          <li
            key={promo.code}
            className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]"
          >
            <div>
              <p className="font-medium tracking-wide">{promo.code}</p>
              <p className="text-sm text-muted-foreground">{promo.label}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={promo.active ? "default" : "outline"}>
                {promo.active ? "Live" : "Off"}
              </Badge>
              <Switch checked={promo.active} onCheckedChange={() => toggle(promo)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
