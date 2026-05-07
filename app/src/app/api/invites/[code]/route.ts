import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET /api/invites/[code] — 客户访问页校验邀请码（公开）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const inv = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!inv) return jsonError("邀请码不存在", 404);

  if (inv.status === "used") {
    return jsonError("此邀请码已被使用", 410);
  }
  if (inv.status === "revoked") {
    return jsonError("此邀请码已作废", 410);
  }
  if (inv.expiresAt < new Date()) {
    return jsonError("此邀请码已过期", 410);
  }

  // 仅返回客户提交需要的预设字段（不暴露内部备注 / createdBy 等）
  return NextResponse.json({
    success: true,
    invite: {
      code: inv.code,
      clientName: inv.clientName,
      clientContact: inv.clientContact,
      clientEmail: inv.clientEmail,
      currency: inv.currency,
      deliveryTerms: inv.deliveryTerms,
      validDays: inv.validDays,
      discount: inv.discount,
      expiresAt: inv.expiresAt,
    },
  });
}
