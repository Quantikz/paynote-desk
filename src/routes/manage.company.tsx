import { createFileRoute } from "@tanstack/react-router";
import { Copy, HardDrive, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WifiShare } from "@/components/wifi-share";
import { pushShelf } from "@/components/hydrate";
import { lanInfo, setStorePassword } from "@/lib/ledger";
import { useShop } from "@/lib/market-hooks";
import { normalizeShop, type ShopProfile } from "@/lib/shop";
import { changeStaffPin } from "@/lib/staff-server";
import { staffToken } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { adminUrl, shopUrl, surface } from "@/lib/surface";

export const Route = createFileRoute("/manage/company")({
  component: CompanyPage,
});

const PUBLIC_SHOP = "https://paynote-shop.vercel.app";
const PUBLIC_DESK = "https://paynote-desk.vercel.app";

function CompanyPage() {
  const shop = useShop();
  const applyShop = useMarket((s) => s.applyShop);
  const [draft, setDraft] = useState<ShopProfile | null>(null);
  const form = draft ?? shop;
  const [pin, setPin] = useState("");
  const [door, setDoor] = useState("");
  const [busy, setBusy] = useState(false);
  const [dataPath, setDataPath] = useState("");
  const shopLink = shopUrl().startsWith("http") ? shopUrl() : PUBLIC_SHOP;
  const deskLink = adminUrl().startsWith("http") ? adminUrl() : PUBLIC_DESK;
  const localComputer = surface() === "both";

  useEffect(() => {
    void lanInfo().then((info) => {
      setDataPath(info.dataDir);
    });
  }, []);

  function setField<K extends keyof ShopProfile>(key: K, value: ShopProfile[K]) {
    setDraft({ ...form, [key]: value });
  }

  async function save() {
    const next = normalizeShop(form);
    applyShop(next);
    setDraft(null);
    const result = await pushShelf();
    if (result.ok) {
      toast.success("Company saved. The shop updates now.");
      return;
    }
    toast.error(result.error ?? "Could not save.");
  }

  async function savePin() {
    const token = staffToken();
    if (!token) {
      toast.error("Unlock the desk first.");
      return;
    }
    setBusy(true);
    const result = await changeStaffPin({ data: { token, pin } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPin("");
    toast.success("Staff PIN updated.");
  }

  async function saveDoor() {
    const token = staffToken() || "offline-local";
    setBusy(true);
    const result = await setStorePassword({ data: { token, password: door } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDoor("");
    toast.success("Store password updated. Phones on this Wi‑Fi use it to open Paynote.");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">White label</p>
        <h1 className="font-display text-4xl">Your company</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Name, address and colour appear on the shop and on receipts. Staff unlock the desk with a PIN.
        </p>
      </div>

      {localComputer ? <WifiShare /> : (
      <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <MonitorSmartphone className="size-4" />
            Live sites
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer shop and staff desk on the internet.
          </p>
        </div>
        <SiteRow label="Customer shop" href={shopLink} onCopy={() => void copy(shopLink, "Shop address")} />
        <SiteRow label="Staff desk" href={deskLink} onCopy={() => void copy(deskLink, "Desk address")} />
      </section>
      )}
      {localComputer && dataPath ? (
        <p className="inline-flex items-start gap-2 text-xs text-muted-foreground">
          <HardDrive className="mt-0.5 size-3.5 shrink-0" />
          Database folder on this computer: {dataPath}
        </p>
      ) : null}

      <form
        className="space-y-5 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" value={form.name} onChange={(v) => setField("name", v)} />
          <Field label="Tagline" value={form.tagline} onChange={(v) => setField("tagline", v)} />
          <Field label="Street" value={form.street} onChange={(v) => setField("street", v)} />
          <Field label="City" value={form.city} onChange={(v) => setField("city", v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => setField("phone", v)} />
          <Field label="Hours" value={form.hours} onChange={(v) => setField("hours", v)} />
          <Field
            label="Ticket prefix"
            value={form.ticketPrefix}
            onChange={(v) => setField("ticketPrefix", v.toUpperCase())}
          />
          <div>
            <Label htmlFor="accent">Shop colour</Label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="accent"
                type="color"
                className="h-10 w-12 cursor-pointer rounded-md border border-input bg-card"
                value={form.accent}
                onChange={(e) => setField("accent", e.target.value)}
              />
              <Input
                value={form.accent}
                onChange={(e) => setField("accent", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="welcome">Welcome text on the shop</Label>
          <Textarea
            id="welcome"
            className="mt-1.5"
            value={form.welcome}
            onChange={(e) => setField("welcome", e.target.value)}
          />
        </div>
        <Button type="submit">Save company</Button>
      </form>

      <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="text-lg font-semibold">Store password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used on this computer and on every phone on the Wi‑Fi. Default is 1234 until you change it.
          </p>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="door">New store password</Label>
          <Input
            id="door"
            type="password"
            autoComplete="off"
            className="mt-1.5 tracking-[0.18em]"
            value={door}
            onChange={(e) => setDoor(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" disabled={busy || door.length < 4} onClick={() => void saveDoor()}>
          {busy ? "Saving…" : "Update store password"}
        </Button>
      </section>

      <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="text-lg font-semibold">Staff PIN</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Extra lock for the desk only. 4 to 8 digits.
          </p>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="new-pin">New PIN</Label>
          <Input
            id="new-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="mt-1.5 font-mono tracking-[0.3em]"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" disabled={busy || pin.length < 4} onClick={() => void savePin()}>
          {busy ? "Saving…" : "Update PIN"}
        </Button>
      </section>
    </div>
  );
}

function SiteRow({ label, href, onCopy }: { label: string; href: string; onCopy: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        <p className="break-all text-sm">{href}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onCopy}>
        <Copy className="size-4" />
        Copy
      </Button>
    </div>
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
      <Input id={id} className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
