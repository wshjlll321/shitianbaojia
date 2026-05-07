import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, res: jsonError("未登录", 401) };
  if (session.user.role !== "admin") return { ok: false as const, res: jsonError("无权限", 403) };
  return { ok: true as const, session };
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      nameZh: true,
      nameEn: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, users });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体格式不正确");
  }

  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const nameZh = String(body.nameZh || "").trim();
  const nameEn = String(body.nameEn || "").trim();
  const phone = String(body.phone || "").trim();
  const role = String(body.role || "sales").trim();
  const isActive = body.isActive === false ? false : true;

  if (!username) return jsonError("账号必填");
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return jsonError("账号仅支持 3-32 位字母/数字/._-");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("邮箱格式不正确");
  if (!nameZh) return jsonError("姓名（中文）必填");
  if (password.length < 8) return jsonError("密码至少 8 位");
  if (!["sales", "admin"].includes(role)) return jsonError("角色不合法");

  const existsUsername = await prisma.user.findFirst({ where: { username }, select: { id: true } });
  if (existsUsername) return jsonError("该账号已存在");
  if (email) {
    const existsEmail = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (existsEmail) return jsonError("该邮箱已存在");
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email: email || null,
      password: hash,
      nameZh,
      nameEn,
      phone,
      role,
      isActive,
    },
    select: {
      id: true,
      username: true,
      email: true,
      nameZh: true,
      nameEn: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, user });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体格式不正确");
  }

  const id = String(body.id || "").trim();
  if (!id) return jsonError("缺少用户 id");

  const patch: any = {};
  if (typeof body.username === "string") {
    const username = String(body.username).trim();
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return jsonError("账号仅支持 3-32 位字母/数字/._-");
    patch.username = username;
  }
  if (typeof body.email === "string") {
    const email = String(body.email).trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("邮箱格式不正确");
    patch.email = email || null;
  }
  if (typeof body.nameZh === "string") patch.nameZh = String(body.nameZh).trim();
  if (typeof body.nameEn === "string") patch.nameEn = String(body.nameEn).trim();
  if (typeof body.phone === "string") patch.phone = String(body.phone).trim();
  if (typeof body.role === "string") {
    const role = String(body.role).trim();
    if (!["sales", "admin"].includes(role)) return jsonError("角色不合法");
    patch.role = role;
  }
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;

  if (typeof body.password === "string" && body.password.trim()) {
    const pwd = String(body.password).trim();
    if (pwd.length < 8) return jsonError("密码至少 8 位");
    patch.password = await bcrypt.hash(pwd, 10);
  }

  if (Object.keys(patch).length === 0) return jsonError("没有可更新字段");

  // prevent self-lockout
  if (gate.session.user.id === id && patch.isActive === false) {
    return jsonError("不能禁用当前登录账号");
  }
  if (gate.session.user.id === id && patch.role && patch.role !== "admin") {
    return jsonError("不能把自己降级为非管理员");
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        username: true,
        email: true,
        nameZh: true,
        nameEn: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ success: true, user });
  } catch {
    return jsonError("更新失败", 500);
  }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") || "").trim();
  if (!id) return jsonError("缺少用户 id");
  if (gate.session.user.id === id) return jsonError("不能删除当前登录账号");

  const quoteCount = await prisma.quote.count({ where: { salesId: id } });
  if (quoteCount > 0) {
    return jsonError(`该账号仍关联 ${quoteCount} 条报价单，建议先“禁用”而不是删除`, 400);
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return jsonError("删除失败", 500);
  }
}

export const runtime = "nodejs";
