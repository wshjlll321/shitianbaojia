import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProductEditorForm from "./ProductEditorForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      skus: {
        orderBy: { isDefault: "desc" },
      },
      accessories: {
        include: { accessory: true },
      },
    },
  });

  if (!product) redirect("/sales/products");

  // If product is a drone, also fetch all accessories for association
  const allAccessories = product.category === "drone"
    ? await prisma.product.findMany({
        where: { category: "accessory", isActive: true },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <ProductEditorForm
      product={product}
      allAccessories={allAccessories}
      currentAccessoryIds={product.accessories.map(a => ({
        id: a.accessoryId,
        isRecommended: a.isRecommended,
      }))}
      initialSkus={product.skus}
    />
  );
}
