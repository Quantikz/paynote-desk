import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rememberStore, storeUnlocked } from "@/lib/door";
import { unlockStore } from "@/lib/ledger";
import { useShop } from "@/lib/market-hooks";
import { surface } from "@/lib/surface";

export function DoorGate({ children }: { children: React.ReactNode }) {
  const hosted = surface() !== "both";
  const [open, setOpen] = useState(() => hosted || storeUnlocked());
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shop = useShop();

  if (open) return children;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await unlockStore({ data: { password } });
      if (!result.ok) {
        setError(result.error);
        setPassword("");
        setBusy(false);
        return;
      }
      rememberStore(keep);
      setOpen(true);
    } catch {
      setError("Could not open the store book.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm rounded-xl bg-card p-8 text-card-foreground shadow-[var(--shadow-border)]"
      >
        <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
          <KeyRound className="size-4" strokeWidth={1.75} />
        </div>
        <p className="mt-5 text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          This computer
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">{shop.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Store password. Anyone on this Wi‑Fi uses the same password. Default is 1234.
        </p>
        <div className="mt-6">
          <Label htmlFor="door">Password</Label>
          <Input
            id="door"
            type="password"
            autoComplete="off"
            autoFocus
            className="mt-1.5 tracking-[0.18em]"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Remember on this computer
        </label>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy}>
          {busy ? "Opening…" : "Open"}
        </Button>
      </form>
    </div>
  );
}
