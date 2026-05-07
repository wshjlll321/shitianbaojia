import { describe, expect, it } from "vitest";
import { validateQuoteCreateInput } from "./quoteValidation";

describe("validateQuoteCreateInput", () => {
  it("requires required fields", () => {
    expect(
      validateQuoteCreateInput({
        clientName: "",
        currency: "USD",
        discount: 0,
        mainProductId: "p",
        mainSkuId: "s",
        accessories: [],
      })
    ).toMatch(/客户名称/);
  });

  it("validates discount range", () => {
    expect(
      validateQuoteCreateInput({
        clientName: "c",
        currency: "USD",
        discount: 101,
        mainProductId: "p",
        mainSkuId: "s",
        accessories: [],
      })
    ).toMatch(/0-100/);
  });

  it("validates duplicate accessories", () => {
    expect(
      validateQuoteCreateInput({
        clientName: "c",
        currency: "USD",
        discount: 0,
        mainProductId: "p",
        mainSkuId: "s",
        accessories: [{ id: "a", qty: 1 }, { id: "a", qty: 2 }],
      })
    ).toMatch(/重复/);
  });

  it("accepts valid input", () => {
    expect(
      validateQuoteCreateInput({
        clientName: "c",
        currency: "USD",
        discount: 5,
        mainProductId: "p",
        mainSkuId: "s",
        accessories: [{ id: "a", qty: 1 }],
      })
    ).toBeNull();
  });
});

