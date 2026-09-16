import { useState } from "react";
import { HardDrive, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pullShelf, pushShelf } from "@/components/hydrate";
import { useMarket } from "@/lib/store";
import { surface } from "@/lib/surface";

export function LiveShelfChip() {
  const version = useMarket((s) => s.shelfVersion);
  const [busy, setBusy] = useState(false);
  const shopOnly = surface() === "shop";

  async function save() {
    setBusy(true);
    const result = await pushShelf();
    setBusy(false);
    if (result.ok) {
      toast.success("Saved to the shop book.");
      return;
    }
    toast.error(result.error ?? "Could not save.");
  }

  if (shopOnly) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:inline-flex">
        <HardDrive className="size-3" />
        Book {version || "on disk"}
      </span>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void save()}>
        <Save className="size-3.5" />
        {busy ? "Saving…" : "Save"}
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
      Shop book {version || "local"}
    </button>
  );
}
