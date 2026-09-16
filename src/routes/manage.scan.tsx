import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { holdStock } from "@/components/hydrate";
import { QrScanner, readCodeFromFile } from "@/components/qr-scanner";
import { QtyStepper } from "@/components/qty-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findProductByScan,
  PAY_LABEL,
  STATUS_LABEL,
  type CartLine,
  type Order,
  type PayMethod,
  type Product,
} from "@/lib/catalog";
import { money, TAX_RATE } from "@/lib/money";
import { isOnline, useOnline } from "@/lib/offline";
import { useMarket } from "@/lib/store";
import { decodeTicket, prettyTicket } from "@/lib/ticket";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/scan")({
  component: ScanPage,
});

function ScanPage() {
  const orders = useMarket((s) => s.orders);
  const products = useMarket((s) => s.products);
  const collectOrder = useMarket((s) => s.collectOrder);
  const acceptTicket = useMarket((s) => s.acceptTicket);
  const ringUp = useMarket((s) => s.ringUp);
  const online = useOnline();
  const [loaded, setLoaded] = useState<Order | null>(null);
  const [fromJson, setFromJson] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [typed, setTyped] = useState("");
  const [pay, setPay] = useState<PayMethod>("cash");
  const [ticket, setTicket] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<PayMethod>("cash");
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLInputElement>(null);

  const applyRaw = useCallback(
    (value: string) => {
      const decoded = decodeTicket(value);
      if (decoded.order) {
        setFromJson(Boolean(decoded.fromJson));
        setTampered(Boolean(decoded.tampered));
        setLoaded(acceptTicket(decoded.order));
        setTicket([]);
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
        setTicket([]);
        return true;
      }
      const product = findProductByScan(products, value);
      if (product) {
        addProduct(product);
        return true;
      }
      return false;
    },
    [acceptTicket, orders, products],
  );

  function addProduct(product: Product) {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    let added = false;
    setLoaded(null);
    setTicket((current) => {
      const existing = current.find((line) => line.productId === product.id);
      const qty = (existing?.qty ?? 0) + 1;
      if (qty > product.stock) return current;
      added = true;
      if (!existing) return [...current, { productId: product.id, qty: 1 }];
      return current.map((line) => (line.productId === product.id ? { ...line, qty } : line));
    });
    if (added) toast.success(`${product.name} added`);
    else toast.error(`Only ${product.stock} ${product.name} left.`);
  }

  const onRead = useCallback(
    (value: string) => {
      if (!applyRaw(value)) toast.error("No ticket or product matched that code.");
    },
    [applyRaw],
  );

  const order = loaded;
  const lines = ticket
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return null;
      return { product, qty: line.qty, lineCents: product.priceCents * line.qty };
    })
    .filter((row): row is { product: Product; qty: number; lineCents: number } => row !== null);
  const subtotal = lines.reduce((n, line) => n + line.lineCents, 0);
  const total = subtotal + Math.round(subtotal * TAX_RATE);

  function lookup() {
    const value = typed.trim() || pasteRef.current?.value.trim() || "";
    if (!value) {
      toast.error("Scan a product or ticket, or type the SKU.");
      return;
    }
    if (!applyRaw(value)) toast.error("No ticket or product matched that.");
    setTyped("");
  }

  async function onFile(file?: File | null) {
    if (!file) return;
    const value = await readCodeFromFile(file);
    if (!value) {
      toast.error("No QR in that photo, and it is not a ticket file.");
      return;
    }
    if (!applyRaw(value)) toast.error("That photo or file has no order or product.");
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

  async function chargeBasket() {
    if (ticket.length === 0) {
      toast.error("Scan what they brought first.");
      return;
    }
    const result = ringUp(ticket, {
      fulfillment: "pickup",
      slot: "Store · now",
      name: "Store sale",
      phone: "—",
      email: "counter@paynote.ng",
      tipCents: 0,
      walkIn: true,
      status: "delivered",
      payment: tender,
    });
    if (result.error || !result.order) {
      toast.error(result.error ?? "Sale did not go through.");
      return;
    }
    if (isOnline()) {
      try {
        await holdStock(result.order.items.map((item) => ({ productId: item.productId, qty: item.qty })));
      } catch {
        /* local stock already moved */
      }
    }
    toast.success(`Recorded ${result.order.number} · ${money(result.order.totalCents)}`);
    setTicket([]);
  }

  function reset() {
    setLoaded(null);
    setFromJson(false);
    setTampered(false);
    setTicket([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {online ? "Counter" : "Offline · on this phone"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Scan what they brought</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan with the camera, or upload a photo of the QR. Each product becomes the order.
            A customer ticket still records their collection. This phone keeps the book even without internet.
          </p>
        </div>
        <QrScanner
          onRead={onRead}
          paused={Boolean(order)}
          onReset={reset}
          continuous={!order}
          hint="Scan a product or ticket, or upload a photo of the QR."
        />
        <div className="flex gap-2">
          <Input
            ref={pasteRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type SKU or paste ticket"
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
          />
          <Button variant="outline" onClick={lookup}>
            Add
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
            Load ticket JSON
          </Button>
        </div>
      </div>

      <aside className="h-fit border border-border bg-card p-5">
        {order ? (
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
                {fromJson ? <Badge variant="secondary">From ticket</Badge> : null}
                {tampered ? <Badge variant="danger">Checksum mismatch</Badge> : null}
              </div>
            </div>
            {tampered ? (
              <p className="text-sm text-destructive">
                This JSON was edited after it was issued. Check the totals before you collect.
              </p>
            ) : fromJson ? (
              <p className="text-sm text-muted-foreground">Loaded from the code. No internet needed.</p>
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
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">This sale</p>
              <h2 className="font-display text-2xl">Scanned items</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only what you scan or tap is recorded. Store purchases use the same book.
              </p>
            </div>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Waiting for a product or ticket.</p>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {line.product.sku} · {money(line.lineCents)}
                      </p>
                    </div>
                    <QtyStepper
                      value={line.qty}
                      max={line.product.stock}
                      onChange={(qty) =>
                        setTicket((current) =>
                          qty <= 0
                            ? current.filter((item) => item.productId !== line.product.id)
                            : current.map((item) =>
                                item.productId === line.product.id ? { ...item, qty } : item,
                              ),
                        )
                      }
                      className="h-9"
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "transfer", "card"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTender(id)}
                  className={cn(
                    "h-11 text-sm capitalize",
                    tender === id ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {id}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT 7.5%</span>
              <span className="tabular-nums">{money(Math.round(subtotal * TAX_RATE))}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => void chargeBasket()} disabled={lines.length === 0}>
              Record {lines.length ? money(total) : "sale"}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
