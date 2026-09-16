import { useState } from "react";
import { HardDrive, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pullShelf, pushShelf } from "@/components/hydrate";
import { useOnline } from "@/lib/offline";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

export function LiveShelfChip() {
  const version = useMarket((s) => s.shelfVersion);
  const [busy, setBusy] = useState(false);
  const shopOnly = surface() === "shop";
  const online = useOnline();

  async function publish() {
    setBusy(true);
    const result = await pushShelf();
    setBusy(false);
    if (result.ok) {
      toast.success(`Shop is live · list ${result.version}`);
      return;
    }
    toast.error(result.error ?? "Could not publish.");
  }

  if (shopOnly) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:inline-flex">
        <HardDrive className="size-3" />
        {online ? `Shop list ${version || "local"}` : "Saved on this phone"}
      </span>
      <Button type="button" size="sm" variant="outline" disabled={busy || !online} onClick={() => void publish()}>
        <Upload className="size-3.5" />
        {busy ? "Publishing…" : online ? "Publish" : "Offline"}
      </Button>
    </div>
  );
}

export function ShopShelfWatcher() {
  const version = useMarket((s) => s.shelfVersion);
  return (
    <button
      type="button"
      className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase"
      onClick={() => void pullShelf()}
    >
      Live list {version || "seed"}
    </button>
  );
}
