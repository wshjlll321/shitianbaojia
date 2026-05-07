export type CurrencyCode = "CNY" | "USD" | "THB";

export interface QuoteAccessoryInput {
  id: string;
  qty: number;
}

export interface QuoteCreateInput {
  clientName: string;
  currency: string;
  discount: number;
  mainProductId: string;
  mainSkuId: string;
  accessories: QuoteAccessoryInput[];
}

export function validateQuoteCreateInput(input: QuoteCreateInput): string | null {
  const clientName = String(input.clientName || "").trim();
  if (!clientName) return "客户名称（clientName）必填";

  const mainProductId = String(input.mainProductId || "").trim();
  if (!mainProductId) return "主机（mainProductId）必填";

  const mainSkuId = String(input.mainSkuId || "").trim();
  if (!mainSkuId) return "主机版本（mainSkuId）必填";

  const discount = Number(input.discount);
  if (!Number.isFinite(discount)) return "折扣（discount）必须是数字";
  if (discount < 0 || discount > 100) return "折扣（discount）必须在 0-100 之间";

  const currency = String(input.currency || "").trim().toUpperCase();
  if (!["CNY", "USD", "THB"].includes(currency)) return "币种（currency）仅支持 CNY/USD/THB";

  if (!Array.isArray(input.accessories)) return "配件（accessories）格式不正确";
  for (const a of input.accessories) {
    const id = String((a as any)?.id || "").trim();
    const qty = Number((a as any)?.qty);
    if (!id) return "配件 id 不能为空";
    if (!Number.isFinite(qty) || qty < 1) return "配件数量（qty）必须 >= 1";
    if (!Number.isInteger(qty)) return "配件数量（qty）必须是整数";
    if (qty > 999) return "配件数量（qty）过大";
  }

  // Disallow duplicate accessory ids (avoid pricing confusion)
  const ids = input.accessories.map((x) => String((x as any)?.id || "").trim()).filter(Boolean);
  const uniq = new Set(ids);
  if (uniq.size !== ids.length) return "配件重复，请合并相同配件的数量";

  return null;
}

