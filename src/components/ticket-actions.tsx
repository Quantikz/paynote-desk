import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/catalog";
import { useShop } from "@/lib/market-hooks";
import { downloadTicketFile, prettyTicket } from "@/lib/ticket";

export function TicketActions({ order }: { order: Order }) {
  const [open, setOpen] = useState(true);
  const shop = useShop();
  const json = prettyTicket(order, shop);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Ticket JSON copied.");
    } catch {
      toast.error("Could not copy. Download the file instead.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => downloadTicketFile(order, shop)}>
          Download JSON
        </Button>
        <Button type="button" variant="outline" onClick={() => void copy()}>
          Copy JSON
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide JSON" : "View JSON"}
        </Button>
      </div>
      {open ? (
        <pre className="max-h-72 overflow-auto border border-border bg-muted p-3 text-[11px] leading-relaxed text-foreground">
          {json}
        </pre>
      ) : null}
    </div>
  );
}
