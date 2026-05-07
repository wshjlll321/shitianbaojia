import { describe, expect, it } from "vitest";
import { generateQuoteNumber } from "./quoteNumber";

describe("generateQuoteNumber", () => {
  it("generates expected format", () => {
    const d = new Date("2026-04-15T10:00:00Z");
    const n = generateQuoteNumber(d);
    expect(n.startsWith("QT-20260415-")).toBe(true);
    expect(n).toHaveLength("QT-20260415-".length + 6);
  });

  it("is very unlikely to collide (sanity)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) set.add(generateQuoteNumber());
    expect(set.size).toBe(200);
  });
});

