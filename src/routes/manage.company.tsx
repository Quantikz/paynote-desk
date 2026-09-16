import { createFileRoute } from "@tanstack/react-router";
import { Copy, MonitorSmartphone, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pushShelf } from "@/components/hydrate";
import { useShop } from "@/lib/market-hooks";
import { normalizeShop, type ShopProfile } from "@/lib/shop";
import { changeStaffPin } from "@/lib/staff-server";
import { staffToken } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { adminUrl, shopUrl } from "@/lib/surface";

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
  const [busy, setBusy] = useState(false);
  const shopLink = shopUrl().startsWith("http") ? shopUrl() : PUBLIC_SHOP;
  const deskLink = adminUrl().startsWith("http") ? adminUrl() : PUBLIC_DESK;

  function setField<K extends keyof ShopProfile>(key: K, value: ShopProfile[K]) {
    setDraft({ ...form, [key]: value });
  }

  async function save() {
    const next = normalizeShop(form);
    applyShop(next);
    setDraft(null);
    const result = await pushShelf();
    if (result.ok) {
      toast.success("Company saved. The shop site updates now.");
      return;
    }
    toast.error(result.error ?? "Saved here, but the live shop did not update.");
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
    toast.success("Staff PIN updated. Use the new PIN next time you unlock.");
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
          Change the name, address, welcome text and colour. The customer shop uses this live — same stock list, same company details.
        </p>
      </div>

      <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="text-lg font-semibold">Your sites</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers only see the shop. Staff open the desk on a phone behind the counter.
          </p>
        </div>
        <SiteRow label="Shop" href={shopLink} icon={Store} onCopy={() => void copy(shopLink, "Shop link")} />
        <SiteRow label="Staff desk" href={deskLink} icon={MonitorSmartphone} onCopy={() => void copy(deskLink, "Desk link")} />
      </section>

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
        <Button type="submit">Save and publish to shop</Button>
      </form>

      <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="text-lg font-semibold">Staff PIN</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Checked on the server, never stored in the shop website. 4 to 8 digits.
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

function SiteRow({
  label,
  href,
  icon: Icon,
  onCopy,
}: {
  label: string;
  href: string;
  icon: typeof Store;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-card text-foreground">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
          <a href={href} className="break-all text-sm underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
            {href}
          </a>
        </div>
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
