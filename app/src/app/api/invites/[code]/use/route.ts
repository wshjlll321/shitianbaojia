import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { deriveShareToken } from "@/lib/shareToken";
import { generateQuoteNumber } from "@/lib/quoteNumber";

function sha256Base64Url(input: string) {
  return createHash("sha256").update(input, "utf8").digest("base64url");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// POST /api/invites/[code]/use — 客户提交，原子事务：建 Quote + 标记已用
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const inv = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!inv) return jsonError("邀请码不存在", 404);
  if (inv.status === "used") return jsonError("此邀请码已被使用", 410);
  if (inv.status === "revoked") return jsonError("此邀请码已作废", 410);
  if (inv.expiresAt < new Date()) return jsonError("此邀请码已过期", 410);

  try {
    const body = await req.json();
    const { mainProductId, mainSkuId, accessories } = body || {};
    if (!mainProductId) return jsonError("请选择无人机", 400);
    if (!mainSkuId) return jsonError("请选择配置版本", 400);

    const mainProduct = await prisma.product.findUnique({ where: { id: mainProductId } });
    if (!mainProduct) return jsonError("Main product not found", 404);
    if (mainProduct.category !== "drone") return jsonError("Main product must be a drone", 400);

    const mainSku = await prisma.sKU.findUnique({ where: { id: String(mainSkuId) } });
    if (!mainSku || mainSku.productId !== mainProductId) {
      return jsonError("Main SKU not found", 404);
    }

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
        return jsonError("所选配件不适配该机型", 400);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + inv.validDays);

    // 计价（沿用 sales/quote 的逻辑）
    let totalPrice = 0;
    const items: any[] = [];

    const mainUnitPrice =
      Number(mainSku.price) || Number(mainProduct.fobPrice) || Number(mainProduct.msrp);
    const mainItemTotal = mainUnitPrice * (1 - inv.discount / 100);
    totalPrice += mainItemTotal;
    items.push({
      productId: mainProduct.id,
      nameZh: mainProduct.nameZh,
      nameEn: mainProduct.nameEn,
      nameTh: "",
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
      totalPrice: mainItemTotal,
      isMainItem: true,
      sortOrder: 1,
    });

    for (let i = 0; i < selectedAcc.length; i++) {
      const accModel = selectedAcc[i];
      const accProduct = await prisma.product.findUnique({ where: { id: accModel.id } });
      if (accProduct && accProduct.category === "accessory") {
        // 若指定了配件 SKU，校验归属并用 SKU 价
        let accSku: any = null;
        const accSkuId = accModel.skuId ? String(accModel.skuId) : "";
        if (accSkuId) {
          accSku = await prisma.sKU.findUnique({ where: { id: accSkuId } });
          if (!accSku || accSku.productId !== accProduct.id) {
            return jsonError("配件配置版本不匹配", 400);
          }
        }
        const accUnitPrice = accSku
          ? Number(accSku.price)
          : Number(accProduct.fobPrice) || Number(accProduct.msrp);
        const qty = Number(accModel.qty) || 1;
        const itemPrice = accUnitPrice * qty * (1 - inv.discount / 100);
        totalPrice += itemPrice;
        items.push({
          productId: accProduct.id,
          nameZh: accProduct.nameZh,
          nameEn: accProduct.nameEn,
          nameTh: "",
          ...(accSku && {
            skuId: accSku.id,
            skuName: accSku.labelZh || accSku.name || "",
            snapshotSkuIncludesZh: (accSku as any).includesZh || "[]",
            snapshotSkuIncludesEn: (accSku as any).includesEn || "[]",
          }),
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
          sortOrder: i + 2,
        });
      }
    }

    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

    // 默认商务条款
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

    // 事务：建 Quote + 标记码已用 + 关联 quoteId
    const result = await prisma.$transaction(async (tx) => {
      let quote: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const quoteNumber = generateQuoteNumber();
        try {
          quote = await tx.quote.create({
            data: {
              quoteNumber,
              status: "sent",
              titleZh: `数字化报价方案 - ${mainProduct.nameZh}`,
              titleEn: `Digital Quotation - ${mainProduct.nameEn}`,
              titleTh: "",
              subtotal,
              discount: inv.discount,
              totalPrice,
              currency: inv.currency,
              deliveryTerms: inv.deliveryTerms,
              validUntil: expiresAt,
              tokenExpiresAt: expiresAt,
              salesId: inv.createdById,
              clientName: inv.clientName,
              clientContact: inv.clientContact,
              clientEmail: inv.clientEmail,
              termsJson,
              paymentTermsZh,
              paymentTermsEn,
              deliveryTimeZh,
              deliveryTimeEn,
              warrantyZh,
              warrantyEn,
              trainingZh,
              trainingEn,
              items: { create: items },
            },
          });
          break;
        } catch (e: any) {
          if (e?.code === "P2002") continue;
          throw e;
        }
      }
      if (!quote) throw new Error("生成报价单失败");

      const token = deriveShareToken(quote.id);
      const tokenHash = sha256Base64Url(token);
      await tx.quote.update({
        where: { id: quote.id },
        data: { shareTokenHash: tokenHash },
      });

      await tx.inviteCode.update({
        where: { id: inv.id },
        data: { status: "used", usedAt: new Date(), quoteId: quote.id },
      });

      return { quote, token };
    });

    return NextResponse.json({
      success: true,
      quoteNumber: result.quote.quoteNumber,
      shareToken: result.token,
    });
  } catch (e) {
    console.error(e);
    return jsonError("Internal Error", 500);
  }
}
