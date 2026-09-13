import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveStaffSession, staffUnlocked } from "@/lib/staff-session";
import { verifyStaffPin } from "@/lib/staff-server";

export { staffUnlocked } from "@/lib/staff-session";
export { STAFF_KEY, STAFF_TOKEN_KEY as STAFF_PIN_KEY, STAFF_UNTIL_KEY } from "@/lib/staff-session";

export function StaffGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-root");
    return () => document.documentElement.classList.remove("admin-root");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await verifyStaffPin({ data: { pin: pin.trim() } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setPin("");
      return;
    }
    saveStaffSession(result.token, result.expiresAt);
    onUnlock();
  }

  return (
    <div className="admin-root flex min-h-dvh items-center justify-center bg-background px-4">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm border border-border bg-card p-8 text-card-foreground"
      >
        <div className="grid size-10 place-items-center bg-primary text-primary-foreground">
          <Lock className="size-4" />
        </div>
        <p className="mt-5 text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Restricted desk
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Paynote desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff only. PIN is checked on the server. Five wrong tries lock the desk for five minutes. Session ends after 30 minutes.
        </p>
        <div className="mt-6">
          <Label htmlFor="pin">Staff PIN</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="mt-1.5 font-mono tracking-[0.3em]"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy}>
          {busy ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
