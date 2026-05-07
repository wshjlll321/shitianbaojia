import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await req.json();

    // Validate JSON fields
    const jsonFields = [
      'featuresZh', 'featuresEn', 'featuresTh',
      'specsZh', 'specsEn', 'specsTh'
    ];
    for (const field of jsonFields) {
      if (data[field]) {
        try {
          JSON.parse(data[field]);
        } catch {
          return new NextResponse(`Invalid JSON in ${field}`, { status: 400 });
        }
      }
    }

    const updateData: Record<string, unknown> = {
      nameZh: data.nameZh,
      nameEn: data.nameEn,
      nameTh: data.nameTh || "",
      msrp: parseFloat(data.msrp) || 0,
      exwPrice: parseFloat(data.exwPrice) || 0,
      fobPrice: parseFloat(data.fobPrice) || 0,
      isActive: data.isActive,
      imageUrl: data.imageUrl || "",
      featuresZh: data.featuresZh || "[]",
      featuresEn: data.featuresEn || "[]",
      featuresTh: data.featuresTh || "[]",
      specsZh: data.specsZh || "{}",
      specsEn: data.specsEn || "{}",
      specsTh: data.specsTh || "{}",
    };

    if (typeof data.model === "string") {
      const newModel = data.model.trim();
      if (!newModel) {
        return NextResponse.json({ error: "型号不能为空" }, { status: 400 });
      }
      const current = await prisma.product.findUnique({ where: { id }, select: { model: true } });
      if (!current) {
        return NextResponse.json({ error: "产品不存在" }, { status: 404 });
      }
      if (newModel !== current.model) {
        updateData.model = newModel;
      }
    }

    try {
      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ success: true, product: updated });
    } catch (e: unknown) {
      if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { error: `型号「${updateData.model}」已被其他产品占用，请换一个` },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
