import { useEffect, useState } from "react";
import { Copy, Monitor, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lanInfo } from "@/lib/ledger";
import { surface } from "@/lib/surface";

export function WifiShare({ compact = false }: { compact?: boolean }) {
  const localOnly = surface() === "both";
  const [localUrl, setLocalUrl] = useState("");
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!localOnly) return;
    void lanInfo().then((info) => {
      setLocalUrl(info.localUrl);
      setUrls(info.urls);
    });
  }, [localOnly]);

  if (!localOnly) return null;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  }

  return (
    <section className="space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <div>
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Wifi className="size-4" />
          This computer and Wi‑Fi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paynote is open on this PC. Anyone on the same Wi‑Fi opens the Wi‑Fi address, then the store password (default 1234).
        </p>
      </div>
      {localUrl ? (
        <Row
          icon={Monitor}
          label="This computer"
          href={localUrl}
          onCopy={() => void copy(localUrl, "This computer")}
        />
      ) : null}
      {urls.length === 0 ? (
        <p className="text-sm text-muted-foreground">Connect this computer to Wi‑Fi to share with phones.</p>
      ) : (
        urls.map((href) => (
          <Row
            key={href}
            icon={Wifi}
            label="Phones on this Wi‑Fi"
            href={href}
            onCopy={() => void copy(href, "Wi‑Fi address")}
          />
        ))
      )}
      {compact ? null : (
        <p className="text-xs text-muted-foreground">
          If a phone cannot open it, allow Paynote on private networks when Windows asks.
        </p>
      )}
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  href,
  onCopy,
}: {
  icon: typeof Wifi;
  label: string;
  href: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-xs tracking-[0.14em] text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </p>
        <p className="break-all text-sm">{href}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onCopy}>
        <Copy className="size-4" />
        Copy
      </Button>
    </div>
  );
}
