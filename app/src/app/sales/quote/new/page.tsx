import { prisma } from "@/lib/prisma";
import QuoteBuilderForm from "./QuoteBuilderForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewQuotePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch drones with their accessory associations
  const mainProducts = await prisma.product.findMany({
    where: { category: "drone", isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      skus: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
      accessories: {
        include: {
          accessory: true,
        },
      },
    },
  });

  // Fetch all accessories (fallback for products without associations)
  const allAccessories = await prisma.product.findMany({
    where: { category: "accessory", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Serialize dates for client component
  const serializedProducts = mainProducts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    skus: p.skus.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    accessories: p.accessories.map((a) => ({
      ...a,
      accessory: {
        ...a.accessory,
        createdAt: a.accessory.createdAt.toISOString(),
        updatedAt: a.accessory.updatedAt.toISOString(),
      },
    })),
  }));

  const serializedAccessories = allAccessories.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <QuoteBuilderForm
      mainProducts={serializedProducts}
      allAccessories={serializedAccessories}
      salesId={session.user.id}
    />
  );
}
