/** Store money as kobo (1 naira = 100 kobo). Display as naira. */
export function ngn(naira: number) {
  return Math.round(naira * 100);
}

export function money(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function nid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const TAX_RATE = 0.075;
export const FREE_DELIVERY_AT = ngn(25000);
export const DELIVERY_FEE = ngn(1500);
export const STAFF_PIN = "1234";
export const TRANSFER_BANK = "GTBank";
export const TRANSFER_ACCOUNT = "0123456789";
export const TRANSFER_NAME = "Paynote Markets Limited";
