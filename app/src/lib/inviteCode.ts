import { randomBytes } from "crypto";

// 客户友好的字符集（排除易混淆的 0/O、1/I）
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateInviteCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
