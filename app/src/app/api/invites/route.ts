import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInviteCode } from "@/lib/inviteCode";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET /api/invites — 后台列表
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const items = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { nameZh: true, nameEn: true } },
      quote: { select: { id: true, quoteNumber: true, totalPrice: true } },
    },
  });

  // 客户端展示前刷新过期状态
  const now = new Date();
  const refreshed = items.map((it) => {
    if (it.status === "pending" && it.expiresAt < now) {
      return { ...it, status: "expired" as const };
    }
    return it;
  });

  return NextResponse.json({ success: true, items: refreshed });
}

// POST /api/invites — 创建
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const clientName = String(body.clientName || "").trim();
    if (!clientName) return jsonError("clientName is required", 400);

    const codeExpiresInDays = Math.max(
      1,
      Math.min(180, Number(body.codeExpiresInDays) || 14),
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + codeExpiresInDays);

    // 5 次重试避免短码冲突
    let code = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateInviteCode(8);
      const exists = await prisma.inviteCode.findUnique({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) return jsonError("生成邀请码失败，请重试", 500);

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        clientName,
        clientContact: String(body.clientContact || "").trim(),
        clientEmail: String(body.clientEmail || "").trim(),
        currency: String(body.currency || "USD").toUpperCase(),
        deliveryTerms: String(body.deliveryTerms || "FOB Qingdao"),
        validDays: Math.max(1, Math.min(365, Number(body.validDays) || 30)),
        discount: Math.max(0, Math.min(100, Number(body.discount) || 0)),
        remark: String(body.remark || ""),
        expiresAt,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, invite }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Internal Error", 500);
  }
}
