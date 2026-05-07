import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  try {
    const products = await prisma.product.findMany({
      where: {
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();

    const model = String(body.model || "").trim();
    const category = String(body.category || "").trim();
    const nameZh = String(body.nameZh || "").trim();

    if (!model) return new NextResponse("model is required", { status: 400 });
    if (!category) return new NextResponse("category is required", { status: 400 });
    if (!nameZh) return new NextResponse("nameZh is required", { status: 400 });

    const product = await prisma.product.create({
      data: {
        model,
        category,
        nameZh,
        nameEn: String(body.nameEn || "").trim(),
        nameTh: String(body.nameTh || "").trim(),

        msrp: Number(body.msrp) || 0,
        exwPrice: Number(body.exwPrice) || 0,
        fobPrice: Number(body.fobPrice) || 0,

        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
        imageUrl: String(body.imageUrl || "").trim(),

        featuresZh: String(body.featuresZh || "[]"),
        featuresEn: String(body.featuresEn || "[]"),
        featuresTh: String(body.featuresTh || "[]"),
        specsZh: String(body.specsZh || "{}"),
        specsEn: String(body.specsEn || "{}"),
        specsTh: String(body.specsTh || "{}"),
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

