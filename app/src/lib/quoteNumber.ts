import { randomBytes } from "crypto";

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// URL-safe, human-friendly alphabet (no 0/O, 1/I ambiguity)
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function base32ish(bytes: Uint8Array, len: number) {
  let out = "";
  for (let i = 0; i < bytes.length && out.length < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out.padEnd(len, "2").slice(0, len);
}

export function generateQuoteNumber(now = new Date()) {
  const suffix = base32ish(randomBytes(8), 6);
  return `QT-${yyyymmdd(now)}-${suffix}`;
}

