import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const SESSION_MINUTES = 30;
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

function staffPin() {
  return (process.env.STAFF_PIN ?? "1234").trim();
}

function sessionKey() {
  const raw = process.env.STAFF_SESSION_SECRET?.trim() || `paynote-desk:${staffPin()}`;
  return new TextEncoder().encode(raw.padEnd(32, "!"));
}

function pinDigest(pin: string) {
  return createHash("sha256").update(`paynote-desk:${pin}`).digest();
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

function digestsMatch(given: string, storedHex: string) {
  const left = pinDigest(given);
  let right: Buffer;
  try {
    right = Buffer.from(storedHex, "hex");
  } catch {
    return false;
  }
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

async function gateRow() {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ fail_count: number; locked_until: string | null; pin_hash: string | null }>`
      select fail_count, locked_until, pin_hash from staff_gate where id = 'desk'
    `;
    return rows[0] ?? { fail_count: 0, locked_until: null, pin_hash: null };
  } catch {
    return { fail_count: 0, locked_until: null, pin_hash: null };
  }
}

async function writeGate(failCount: number, lockedUntil: string | null, pinHash?: string | null) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (pinHash !== undefined) {
      await sql`
        insert into staff_gate (id, fail_count, locked_until, pin_hash)
        values ('desk', ${failCount}, ${lockedUntil}, ${pinHash})
        on conflict (id) do update set
          fail_count = excluded.fail_count,
          locked_until = excluded.locked_until,
          pin_hash = excluded.pin_hash
      `;
      return;
    }
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

  const ok = row.pin_hash ? digestsMatch(given, row.pin_hash) : pinsMatch(given, staffPin());
  if (!ok) {
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

export async function setDeskPin(token: string, nextPin: string) {
  if (!(await staffTokenValid(token))) {
    return { ok: false as const, error: "Staff session expired. Unlock the desk again." };
  }
  const pin = nextPin.trim();
  if (!/^\d{4,8}$/.test(pin)) {
    return { ok: false as const, error: "PIN must be 4 to 8 digits." };
  }
  const row = await gateRow();
  await writeGate(0, null, pinDigest(pin).toString("hex"));
  return { ok: true as const, error: undefined, hadLock: Boolean(row.locked_until) };
}
