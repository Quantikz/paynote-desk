import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { StorefrontShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORE } from "@/lib/catalog";
import { useCartLines, useCartSubtotal } from "@/lib/market-hooks";
import { money, TAX_RATE } from "@/lib/money";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const lines = useCartLines();
  const subtotal = useCartSubtotal();
  const applyPromo = useMarket((s) => s.applyPromo);
  const placeOrder = useMarket((s) => s.placeOrder);
  const navigate = useNavigate();

  const [name, setName] = useState("Chioma Okeke");
  const [phone, setPhone] = useState("0803 441 2210");
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string>();
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);

  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = Math.round(afterDiscount * TAX_RATE);
  const total = afterDiscount + tax;

  function onApplyPromo() {
    const result = applyPromo(promoInput, subtotal);
    if (result.error && result.discount === 0) {
      toast.error(result.error);
      setPromoCode(undefined);
      setDiscount(0);
      return;
    }
    setPromoCode(result.promo?.code);
    setDiscount(result.discount);
    toast.success(`${result.promo?.code} applied`);
  }

  function onConfirm() {
    if (lines.length === 0) return;
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }
    setBusy(true);
    const result = placeOrder({
      fulfillment: "pickup",
      slot: "Collect at shop",
      name,
      phone,
      email: "",
      notes,
      promoCode,
      tipCents: 0,
    });
    setBusy(false);
    if (result.error || !result.order) {
      toast.error(result.error ?? "We could not place this order.");
      return;
    }
    toast.success("Order placed. Show your code at the shop.");
    void navigate({ to: "/receipt/$id", params: { id: result.order.id } });
  }

  if (lines.length === 0) {
    return (
      <StorefrontShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-3xl">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add items, then confirm the order.</p>
          <Button asChild className="mt-6">
            <Link to="/">Go to shop</Link>
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Checkout</p>
            <h1 className="font-display mt-1 text-4xl">Confirm your order</h1>
            <p className="mt-2 text-muted-foreground">
              You will get a code. Bring it to {STORE.street} and pay when you collect.
            </p>
          </div>

          <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} />
              <Field label="Phone number" value={phone} onChange={setPhone} />
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Note for the shop (optional)</Label>
                <Textarea
                  id="notes"
                  className="mt-1.5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="If we should pack something a certain way…"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl bg-card p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-24">
          <h2 className="font-display text-xl">To collect</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.product.id} className="flex justify-between gap-3 text-sm">
                <span>
                  {line.qty} × {line.product.name}
                </span>
                <span className="tabular-nums">{money(line.lineCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="FRESH10"
            />
            <Button type="button" variant="outline" onClick={onApplyPromo}>
              Apply
            </Button>
          </div>
          <dl className="mt-5 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Promo {promoCode}</dt>
                <dd className="tabular-nums">−{money(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT (7.5%)</dt>
              <dd className="tabular-nums">{money(tax)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base font-medium">
              <dt>Pay at shop</dt>
              <dd className="tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          <Button className="mt-5 w-full" size="lg" disabled={busy} onClick={onConfirm}>
            Confirm order
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No payment now. The officer will collect it when they scan your code.
          </p>
        </aside>
      </div>
    </StorefrontShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
