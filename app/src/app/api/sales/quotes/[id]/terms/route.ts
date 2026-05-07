import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

type TermItem = {
  key: string;
  labelZh?: string;
  labelEn?: string;
  valueZh?: string;
  valueEn?: string;
  enabled?: boolean;
  order?: number;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("未登录", 401);

  const { id } = await params;
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体格式不正确");
  }

  const pickText = (v: any) => String(v ?? "").trim().slice(0, 2000);

  const normalizeTerms = (raw: any): TermItem[] | null => {
    if (!Array.isArray(raw)) return null;
    const out: TermItem[] = [];
    for (let i = 0; i < raw.length; i++) {
      const t = raw[i] as any;
      const key = String(t?.key ?? "").trim();
      if (!key) continue;
      out.push({
        key,
        labelZh: String(t?.labelZh ?? "").trim().slice(0, 64),
        labelEn: String(t?.labelEn ?? "").trim().slice(0, 64),
        valueZh: pickText(t?.valueZh),
        valueEn: pickText(t?.valueEn),
        enabled: t?.enabled === false ? false : true,
        order: Number.isFinite(Number(t?.order)) ? Number(t.order) : i * 10,
      });
    }
    // stable ordering
    out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return out;
  };

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: { id: true, salesId: true },
    });
    if (!quote) return jsonError("报价单不存在", 404);
    const isAdmin = session.user.role === "admin";
    if (!isAdmin && quote.salesId !== session.user.id) return jsonError("无权限", 403);

    const terms = normalizeTerms(body.terms);
    const termsJson = terms ? JSON.stringify(terms) : undefined;

    // Keep legacy fields in sync for backward compatibility with existing rendering.
    const pickFromTerms = (k: string) => terms?.find((x) => x.key === k);
    const warranty = pickFromTerms("warranty");
    const payment = pickFromTerms("payment");
    const delivery = pickFromTerms("delivery");
    const training = pickFromTerms("training");

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(termsJson ? { termsJson } : {}),
        // legacy fallbacks (also accept old payload fields)
        warrantyZh: warranty?.valueZh ? pickText(warranty.valueZh) : pickText(body.warrantyZh),
        warrantyEn: warranty?.valueEn ? pickText(warranty.valueEn) : pickText(body.warrantyEn),
        paymentTermsZh: payment?.valueZh ? pickText(payment.valueZh) : pickText(body.paymentTermsZh),
        paymentTermsEn: payment?.valueEn ? pickText(payment.valueEn) : pickText(body.paymentTermsEn),
        deliveryTimeZh: delivery?.valueZh ? pickText(delivery.valueZh) : pickText(body.deliveryTimeZh),
        deliveryTimeEn: delivery?.valueEn ? pickText(delivery.valueEn) : pickText(body.deliveryTimeEn),
        trainingZh: training?.valueZh ? pickText(training.valueZh) : pickText(body.trainingZh),
        trainingEn: training?.valueEn ? pickText(training.valueEn) : pickText(body.trainingEn),
      },
      select: {
        id: true,
        termsJson: true,
        warrantyZh: true,
        warrantyEn: true,
        paymentTermsZh: true,
        paymentTermsEn: true,
        deliveryTimeZh: true,
        deliveryTimeEn: true,
        trainingZh: true,
        trainingEn: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, quote: updated });
  } catch (e) {
    console.error("update quote terms error:", e);
    return jsonError("保存失败", 500);
  }
}

export const runtime = "nodejs";

