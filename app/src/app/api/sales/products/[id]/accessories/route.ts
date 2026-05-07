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
    const { accessories } = await req.json();

    // Verify product exists and is a drone
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return new NextResponse("Product not found", { status: 404 });
    if (product.category !== "drone") {
      return new NextResponse("Only drone products can have accessories", { status: 400 });
    }

    // Delete all existing associations
    await prisma.productAccessory.deleteMany({
      where: { mainProductId: id },
    });

    // Create new associations
    if (accessories && accessories.length > 0) {
      await prisma.productAccessory.createMany({
        data: accessories.map((acc: { id: string; isRecommended: boolean }) => ({
          mainProductId: id,
          accessoryId: acc.id,
          isRecommended: acc.isRecommended || false,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
