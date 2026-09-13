import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const SESSION_MINUTES = 30;
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

function staffPin() {
  return (process.env.STAFF_PIN ?? "1234").trim();
}

function sessionKey() {
  const raw =
    process.env.STAFF_SESSION_SECRET?.trim() || `paynote-desk:${staffPin()}`;
  return new TextEncoder().encode(raw.padEnd(32, "!"));
}

function pinsMatch(given: string, expected: string) {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}

async function gateRow() {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ fail_count: number; locked_until: string | null }>`
      select fail_count, locked_until from staff_gate where id = 'desk'
    `;
    return rows[0] ?? { fail_count: 0, locked_until: null };
  } catch {
    return { fail_count: 0, locked_until: null };
  }
}

async function writeGate(failCount: number, lockedUntil: string | null) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into staff_gate (id, fail_count, locked_until)
      values ('desk', ${failCount}, ${lockedUntil})
      on conflict (id) do update set
        fail_count = excluded.fail_count,
        locked_until = excluded.locked_until
    `;
  } catch {
    // Preview without the lock table still rejects the PIN.
  }
}

export async function unlockDesk(pin: string): Promise<
  { ok: true; token: string; expiresAt: number } | { ok: false; error: string }
> {
  const given = pin.trim();
  if (!given) return { ok: false, error: "Enter the staff PIN." };

  const row = await gateRow();
  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (until > Date.now()) {
      const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
      return { ok: false, error: `Desk is locked. Try again in ${mins} min.` };
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 180));

  if (!pinsMatch(given, staffPin())) {
    const fails = row.fail_count + 1;
    const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    await writeGate(fails, locked);
    if (locked) return { ok: false, error: "Too many tries. Desk locked for 5 minutes." };
    return { ok: false, error: "Wrong PIN." };
  }

  await writeGate(0, null);
  const expiresAt = Date.now() + SESSION_MINUTES * 60 * 1000;
  const token = await new SignJWT({ role: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MINUTES}m`)
    .setSubject("paynote-desk")
    .sign(sessionKey());
  return { ok: true, token, expiresAt };
}

export async function staffTokenValid(token: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    return payload.role === "staff" && payload.sub === "paynote-desk";
  } catch {
    return false;
  }
}
