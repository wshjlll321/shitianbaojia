import { createHmac } from "crypto";

const DEFAULT_SECRET = "dev-only-change-me";

export function deriveShareToken(quoteId: string) {
  const secret = process.env.SHARE_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
  // base64url + short, stable, hard-to-guess
  const full = createHmac("sha256", secret).update(quoteId, "utf8").digest("base64url");
  return full.slice(0, 12);
}

