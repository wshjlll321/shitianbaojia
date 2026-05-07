export interface SkuInput {
  sku: string;
  name?: string;
  labelZh?: string;
  price: number;
}

export function validateSkuInput(input: SkuInput): string | null {
  const sku = String(input.sku || "").trim();
  const name = String(input.name || "").trim();
  const labelZh = String(input.labelZh || "").trim();
  const price = Number(input.price);

  if (!sku) return "SKU 编码（sku）必填";
  if (!name && !labelZh) return "版本名必填（name 或 labelZh）";
  if (!Number.isFinite(price)) return "价格（price）必填";
  return null;
}

