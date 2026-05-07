import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createHash } from "crypto";
import { deriveShareToken } from "@/lib/shareToken";
import { generateQuoteNumber } from "@/lib/quoteNumber";
import { validateQuoteCreateInput } from "@/lib/quoteValidation";

function sha256Base64Url(input: string) {
  return createHash("sha256").update(input, "utf8").digest("base64url");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { clientName, clientContact, clientEmail, currency, discount, deliveryTerms, mainProductId, mainSkuId, accessories, validDays } = body || {};

    const vErr = validateQuoteCreateInput({ clientName, currency, discount, mainProductId, mainSkuId, accessories });
    if (vErr) return jsonError(vErr, 400);

    const mainProduct = await prisma.product.findUnique({ where: { id: mainProductId } });
    if (!mainProduct) return jsonError("Main product not found", 404);
    if (mainProduct.category !== "drone") return jsonError("Main product must be a drone", 400);

    const mainSku = mainSkuId
      ? await prisma.sKU.findUnique({ where: { id: String(mainSkuId) } })
      : null;
    if (!mainSku || mainSku.productId !== mainProductId) {
      return jsonError("Main SKU not found", 404);
    }

    // Validate accessory compatibility (only allow accessories linked to this main product)
    const selectedAcc = Array.isArray(accessories) ? accessories : [];
    const selectedAccIds = selectedAcc.map((a: any) => String(a?.id || "").trim()).filter(Boolean);
    if (selectedAccIds.length > 0) {
      const links = await prisma.productAccessory.findMany({
        where: { mainProductId, accessoryId: { in: selectedAccIds } },
        select: { accessoryId: true },
      });
      const okSet = new Set(links.map((l) => l.accessoryId));
      const invalid = selectedAccIds.filter((id: string) => !okSet.has(id));
      if (invalid.length > 0) {
        return jsonError("所选配件不适配该机型，请返回重新选择", 400);
      }
    }

    const validDaysNum = Math.max(1, Math.min(365, Number(validDays) || 30));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDaysNum);

    // calc subtotals
    let totalPrice = 0;

    // items array to create
    const items = [];

    // add main drone — use SKU price first, fall back to FOB/MSRP
    const mainUnitPrice = Number(mainSku.price) || Number(mainProduct.fobPrice) || Number(mainProduct.msrp);
    const mainPrice = mainUnitPrice * (1 - discount/100);
    totalPrice += mainPrice;
    items.push({
      productId: mainProduct.id,
      nameZh: mainProduct.nameZh,
      nameEn: mainProduct.nameEn,
      nameTh: '',
      skuId: mainSku.id,
      skuName: mainSku.labelZh || mainSku.name || "",
      snapshotSkuIncludesZh: (mainSku as any).includesZh || "[]",
      snapshotSkuIncludesEn: (mainSku as any).includesEn || "[]",
      snapshotModel: mainProduct.model,
      snapshotImageUrl: mainProduct.imageUrl || "",
      snapshotFeaturesZh: mainProduct.featuresZh || "[]",
      snapshotFeaturesEn: mainProduct.featuresEn || "[]",
      snapshotSpecsZh: mainProduct.specsZh || "{}",
      snapshotSpecsEn: mainProduct.specsEn || "{}",
      quantity: 1,
      unitPrice: mainUnitPrice,
      totalPrice: mainPrice,
      isMainItem: true,
      sortOrder: 1
    });

    // add access
    for (let i = 0; i < selectedAcc.length; i++) {
      const accModel = selectedAcc[i];
      const accProduct = await prisma.product.findUnique({ where: { id: accModel.id } });
      if (accProduct) {
        if (accProduct.category !== "accessory") {
          return jsonError("存在无效配件项", 400);
        }
        const accUnitPrice = Number(accProduct.fobPrice) || Number(accProduct.msrp);
        const qty = Number(accModel.qty);
        const itemPrice = accUnitPrice * qty * (1 - discount/100);
        totalPrice += itemPrice;
        items.push({
          productId: accProduct.id,
          nameZh: accProduct.nameZh,
          nameEn: accProduct.nameEn,
          nameTh: '',
          snapshotModel: accProduct.model,
          snapshotImageUrl: accProduct.imageUrl || "",
          snapshotFeaturesZh: accProduct.featuresZh || "[]",
          snapshotFeaturesEn: accProduct.featuresEn || "[]",
          snapshotSpecsZh: accProduct.specsZh || "{}",
          snapshotSpecsEn: accProduct.specsEn || "{}",
          quantity: qty,
          unitPrice: accUnitPrice,
          totalPrice: itemPrice,
          isMainItem: false,
          sortOrder: i + 2
        });
      }
    }

    // Create quote with collision-safe quoteNumber (retry on unique conflicts)
    let quote: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const quoteNumber = generateQuoteNumber();
      try {
        const warrantyZh = "自交付之日起12个月有限质保";
        const warrantyEn = "12 months limited warranty from the date of delivery";
        const paymentTermsZh = "支付方式：100% 预付";
        const paymentTermsEn = "100% Advance Payment";
        const deliveryTimeZh = "确认收款后7个工作日内发货";
        const deliveryTimeEn = "Ships within 7 working days upon recieving payment";
        const trainingZh = "含5天免费操作培训";
        const trainingEn = "5-day free operation training included";

        const termsJson = JSON.stringify([
          { key: "warranty", labelZh: "质保", labelEn: "Warranty", valueZh: warrantyZh, valueEn: warrantyEn, enabled: true, order: 10 },
          { key: "payment", labelZh: "付款", labelEn: "Payment", valueZh: paymentTermsZh, valueEn: paymentTermsEn, enabled: true, order: 20 },
          { key: "delivery", labelZh: "交付", labelEn: "Delivery", valueZh: deliveryTimeZh, valueEn: deliveryTimeEn, enabled: true, order: 30 },
          { key: "training", labelZh: "培训", labelEn: "Training", valueZh: trainingZh, valueEn: trainingEn, enabled: true, order: 40 },
        ]);

        // 折前合计（subtotal）= sum of unitPrice * quantity
        const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
        const discountPct = Number(discount) || 0;

        quote = await prisma.quote.create({
          data: {
            quoteNumber,
            // 生成后即可分享链接，视为已对外可送达（非草稿）
            status: "sent",
            titleZh: `数字化报价方案 - ${mainProduct.nameZh}`,
            titleEn: `Digital Quotation - ${mainProduct.nameEn}`,
            titleTh: '',
            subtotal,
            discount: discountPct,
            totalPrice,
            currency: String(currency).toUpperCase(),
            deliveryTerms: deliveryTerms || 'EXW',
            validUntil: expiresAt,
            tokenExpiresAt: expiresAt,
            salesId: session.user.id,
            clientName: String(clientName || "").trim(),
            clientContact: String(clientContact || "").trim(),
            clientEmail: String(clientEmail || "").trim(),
            termsJson,
            paymentTermsZh,
            paymentTermsEn,
            deliveryTimeZh,
            deliveryTimeEn,
            warrantyZh,
            warrantyEn,
            trainingZh,
            trainingEn,
            items: {
              create: items
            }
          }
        });
        break;
      } catch (e: any) {
        // Prisma unique constraint
        if (e?.code === "P2002") continue;
        throw e;
      }
    }
    if (!quote) return jsonError("生成报价失败，请重试", 500);

    // Deterministic token derived from quote id (DB stores hash only)
    const token = deriveShareToken(quote.id);
    const tokenHash = sha256Base64Url(token);
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { shareTokenHash: tokenHash },
    });

    return NextResponse.json({ success: true, quote: updated, shareToken: token });
  } catch (error) {
    console.error(error);
    return jsonError("Internal Error", 500);
  }
}
