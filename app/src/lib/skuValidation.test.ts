import { describe, expect, it } from "vitest";
import { validateSkuInput } from "./skuValidation";

describe("validateSkuInput", () => {
  it("requires sku", () => {
    expect(validateSkuInput({ sku: " ", price: 1, labelZh: "标准版" })).toMatch(/sku/);
  });

  it("requires name or labelZh", () => {
    expect(validateSkuInput({ sku: "H15-STD", price: 1, name: " ", labelZh: " " })).toMatch(/版本名/);
  });

  it("requires finite price", () => {
    expect(validateSkuInput({ sku: "H15-STD", price: Number("x") as any, labelZh: "标准版" })).toMatch(/价格/);
  });

  it("accepts valid input", () => {
    expect(validateSkuInput({ sku: "H15-STD", price: 1, labelZh: "标准版" })).toBeNull();
  });
});

