import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAFF_PIN } from "@/lib/money";

export const STAFF_KEY = "paynote-staff";
export const STAFF_PIN_KEY = "paynote-staff-pin";
export const STAFF_UNTIL_KEY = "paynote-staff-until";
const SESSION_MS = 30 * 60 * 1000;

export function staffUnlocked() {
  if (typeof window === "undefined") return false;
  const until = Number(sessionStorage.getItem(STAFF_UNTIL_KEY) ?? 0);
  if (!until || Date.now() > until) {
    sessionStorage.removeItem(STAFF_KEY);
    sessionStorage.removeItem(STAFF_PIN_KEY);
    sessionStorage.removeItem(STAFF_UNTIL_KEY);
    return false;
  }
  return sessionStorage.getItem(STAFF_KEY) === "1";
}

export function StaffGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("admin-root");
    return () => document.documentElement.classList.remove("admin-root");
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pin.trim() === STAFF_PIN) {
      sessionStorage.setItem(STAFF_KEY, "1");
      sessionStorage.setItem(STAFF_PIN_KEY, pin.trim());
      sessionStorage.setItem(STAFF_UNTIL_KEY, String(Date.now() + SESSION_MS));
      onUnlock();
      return;
    }
    setError("Wrong PIN.");
  }

  return (
    <div className="admin-root flex min-h-dvh items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-border bg-card p-8 text-card-foreground"
      >
        <div className="grid size-10 place-items-center bg-primary text-primary-foreground">
          <Lock className="size-4" />
        </div>
        <p className="mt-5 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Restricted
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Paynote desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff only. Scan customer codes and collect payment. Session ends after 30 minutes.
        </p>
        <div className="mt-6">
          <Label htmlFor="pin">Staff PIN</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="mt-1.5"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" size="lg">
          Unlock
        </Button>
      </form>
    </div>
  );
}
