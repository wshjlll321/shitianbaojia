import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateSkuInput } from "@/lib/skuValidation";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;

  try {
    const skus = await prisma.sKU.findMany({
      where: { productId: id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ success: true, skus });
  } catch (error) {
    console.error(error);
    return jsonError("Internal Error", 500);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;

  try {
    const body = await req.json();

    const sku = String(body.sku || "").trim();
    const name = String(body.name || "").trim();
    const nameEn = String(body.nameEn || "").trim();
    const labelZh = String(body.labelZh || "").trim();
    const labelEn = String(body.labelEn || "").trim();
    const price = Number(body.price);
    const isDefault = !!body.isDefault;

    const vErr = validateSkuInput({ sku, name, labelZh, price });
    if (vErr) return jsonError(vErr);

    // Ensure product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return jsonError("Product not found", 404);

    if (isDefault) {
      await prisma.sKU.updateMany({
        where: { productId: id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.sKU.create({
      data: {
        productId: id,
        sku,
        name: name || labelZh,
        nameEn: nameEn || labelEn,
        labelZh,
        labelEn,
        price,
        descZh: String(body.descZh || ""),
        descEn: String(body.descEn || ""),
        includesZh: String(body.includesZh || "[]"),
        includesEn: String(body.includesEn || "[]"),
        isDefault,
      },
    });

    return NextResponse.json({ success: true, sku: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = (error as any)?.code === "P2002"
      ? "SKU 编码重复，请换一个（sku 唯一）"
      : "Internal Error";
    return jsonError(msg, 500);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;

  try {
    const body = await req.json();
    const skuId = String(body.skuId || "").trim();
    if (!skuId) return jsonError("skuId is required");

    const patch: any = {};
    if (body.name !== undefined) patch.name = String(body.name || "");
    if (body.nameEn !== undefined) patch.nameEn = String(body.nameEn || "");
    if (body.labelZh !== undefined) patch.labelZh = String(body.labelZh || "");
    if (body.labelEn !== undefined) patch.labelEn = String(body.labelEn || "");
    if (body.price !== undefined) patch.price = Number(body.price) || 0;
    if (body.descZh !== undefined) patch.descZh = String(body.descZh || "");
    if (body.descEn !== undefined) patch.descEn = String(body.descEn || "");
    if (body.includesZh !== undefined) patch.includesZh = String(body.includesZh || "[]");
    if (body.includesEn !== undefined) patch.includesEn = String(body.includesEn || "[]");

    const makeDefault = body.isDefault === true;
    if (makeDefault) {
      await prisma.sKU.updateMany({
        where: { productId: id, isDefault: true },
        data: { isDefault: false },
      });
      patch.isDefault = true;
    } else if (body.isDefault === false) {
      patch.isDefault = false;
    }

    const updated = await prisma.sKU.update({
      where: { id: skuId },
      data: patch,
    });

    return NextResponse.json({ success: true, sku: updated });
  } catch (error) {
    console.error(error);
    const msg = (error as any)?.code === "P2002"
      ? "SKU 编码重复，请换一个（sku 唯一）"
      : "Internal Error";
    return jsonError(msg, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const skuId = String(body.skuId || "").trim();
    if (!skuId) return jsonError("skuId is required");

    // ensure belongs to product
    const sku = await prisma.sKU.findUnique({ where: { id: skuId } });
    if (!sku || sku.productId !== id) return jsonError("SKU not found", 404);

    await prisma.sKU.delete({ where: { id: skuId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return jsonError("Internal Error", 500);
  }
}

