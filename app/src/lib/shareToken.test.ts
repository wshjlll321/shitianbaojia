import { describe, expect, it } from "vitest";
import { deriveShareToken } from "./shareToken";

describe("deriveShareToken", () => {
  it("returns stable 12-char token for same quoteId", () => {
    process.env.SHARE_TOKEN_SECRET = "unit-test-secret";
    const a = deriveShareToken("quote_123");
    const b = deriveShareToken("quote_123");
    expect(a).toBe(b);
    expect(a).toHaveLength(12);
  });

  it("returns different token for different quoteId", () => {
    process.env.SHARE_TOKEN_SECRET = "unit-test-secret";
    const a = deriveShareToken("quote_123");
    const b = deriveShareToken("quote_456");
    expect(a).not.toBe(b);
  });

  it("uses base64url-safe characters", () => {
    process.env.SHARE_TOKEN_SECRET = "unit-test-secret";
    const t = deriveShareToken("quote_123");
    expect(/^[A-Za-z0-9_-]{12}$/.test(t)).toBe(true);
  });
});

