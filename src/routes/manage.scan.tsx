import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { QrScanner } from "@/components/qr-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAY_LABEL, STATUS_LABEL, type Order, type PayMethod } from "@/lib/catalog";
import { money } from "@/lib/money";
import { useMarket } from "@/lib/store";
import { decodeTicket, prettyTicket } from "@/lib/ticket";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/scan")({
  component: ScanPage,
});

function ScanPage() {
  const orders = useMarket((s) => s.orders);
  const collectOrder = useMarket((s) => s.collectOrder);
  const acceptTicket = useMarket((s) => s.acceptTicket);
  const [loaded, setLoaded] = useState<Order | null>(null);
  const [fromJson, setFromJson] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [typed, setTyped] = useState("");
  const [pay, setPay] = useState<PayMethod>("cash");
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLInputElement>(null);

  const applyRaw = useCallback(
    (value: string) => {
      const decoded = decodeTicket(value);
      if (decoded.order) {
        setFromJson(Boolean(decoded.fromJson));
        setTampered(Boolean(decoded.tampered));
        setLoaded(acceptTicket(decoded.order));
        return true;
      }
      const found = orders.find(
        (order) =>
          (decoded.id && order.id === decoded.id) ||
          (decoded.number && order.number.toLowerCase() === decoded.number?.toLowerCase()),
      );
      if (found) {
        setFromJson(false);
        setTampered(false);
        setLoaded(found);
        return true;
      }
      return false;
    },
    [acceptTicket, orders],
  );

  const onRead = useCallback(
    (value: string) => {
      if (!applyRaw(value)) toast.error("That code has no order JSON on it.");
    },
    [applyRaw],
  );

  const order = loaded;

  function lookup() {
    const value = typed.trim() || pasteRef.current?.value.trim() || "";
    if (!value) {
      toast.error("Scan the code, load the JSON file, or paste the ticket.");
      return;
    }
    if (!applyRaw(value)) toast.error("That code has no order on it.");
  }

  async function onFile(file?: File | null) {
    if (!file) return;
    const text = await file.text();
    if (!applyRaw(text)) toast.error("That file is not a Paynote ticket JSON.");
  }

  function collect() {
    if (!order) return;
    acceptTicket(order);
    const result = collectOrder(order.id, pay);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Recorded ${order.number} · ${money(order.totalCents)} · ${PAY_LABEL[pay]}`);
    setLoaded(null);
    setFromJson(false);
    setTampered(false);
    setTyped("");
  }

  function reset() {
    setLoaded(null);
    setFromJson(false);
    setTampered(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Secure desk</p>
          <h1 className="text-3xl font-semibold tracking-tight">Scan customer code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The QR holds the complete order. Scan it to record what they brought. Works on this phone even without internet.
          </p>
        </div>
        <QrScanner onRead={onRead} paused={Boolean(order)} onReset={reset} />
        <div className="flex gap-2">
          <Input
            ref={pasteRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Paste full ticket JSON"
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
          />
          <Button variant="outline" onClick={lookup}>
            Load
          </Button>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            Load JSON file
          </Button>
        </div>
      </div>

      <aside className="h-fit border border-border bg-card p-5">
        {!order ? (
          <p className="text-sm text-muted-foreground">Waiting for a code or JSON file.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-semibold">{order.number}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customer.name} · {order.customer.phone}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge>{STATUS_LABEL[order.status]}</Badge>
                {fromJson ? <Badge variant="secondary">From ticket JSON</Badge> : null}
                {tampered ? <Badge variant="danger">Checksum mismatch</Badge> : null}
              </div>
            </div>
            {tampered ? (
              <p className="text-sm text-destructive">
                This JSON was edited after it was issued. Check the totals before you collect.
              </p>
            ) : fromJson ? (
              <p className="text-sm text-muted-foreground">
                Loaded from the code itself. No shop lookup required.
              </p>
            ) : null}
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.name}`} className="flex justify-between gap-3">
                  <span>
                    {item.qty} × {item.name}
                    <span className="block text-xs text-muted-foreground">
                      {item.sku ? `${item.sku} · ` : ""}
                      {item.unit}
                    </span>
                  </span>
                  <span className="tabular-nums">{money(item.priceCents * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Promo</dt>
                  <dd className="tabular-nums">−{money(order.discountCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT</dt>
                <dd className="tabular-nums">{money(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Collect</dt>
                <dd className="tabular-nums">{money(order.totalCents)}</dd>
              </div>
            </dl>
            {order.status === "delivered" ? (
              <p className="text-sm text-muted-foreground">Already collected and paid.</p>
            ) : order.status === "cancelled" ? (
              <p className="text-sm text-destructive">This order was cancelled.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "transfer", "card"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPay(id)}
                      className={cn(
                        "h-11 text-sm capitalize",
                        pay === id ? "bg-primary text-primary-foreground" : "bg-secondary",
                      )}
                    >
                      {id}
                    </button>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={collect}>
                  Record {money(order.totalCents)}
                </Button>
              </>
            )}
            {fromJson ? (
              <pre className="max-h-40 overflow-auto bg-muted p-3 text-[10px] leading-relaxed">
                {prettyTicket(order)}
              </pre>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
