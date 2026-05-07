import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProductEditorForm from "../../products/[id]/ProductEditorForm";

export default async function EditAccessoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  if (id === "new") {
    const newProduct = {
      id: "new",
      model: "",
      nameZh: "",
      nameEn: "",
      nameTh: "",
      category: "accessory",
      msrp: 0,
      exwPrice: 0,
      fobPrice: 0,
      isActive: true,
      imageUrl: "",
      featuresZh: "[]",
      featuresEn: "[]",
      featuresTh: "[]",
      specsZh: "{}",
      specsEn: "{}",
      specsTh: "{}",
    };
    return (
      <ProductEditorForm
        product={newProduct}
        allAccessories={[]}
        currentAccessoryIds={[]}
        compatibleDrones={[]}
      />
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) redirect("/sales/accessories");

  const compatibleLinks = await prisma.productAccessory.findMany({
    where: { accessoryId: id },
    include: { mainProduct: true },
    orderBy: { mainProduct: { sortOrder: "asc" } },
  });

  const compatibleDrones = compatibleLinks.map((l) => ({
    id: l.mainProduct.id,
    model: l.mainProduct.model,
    nameZh: l.mainProduct.nameZh,
    nameEn: l.mainProduct.nameEn,
    isRecommended: l.isRecommended,
  }));

  return (
    <ProductEditorForm
      product={product}
      allAccessories={[]}
      currentAccessoryIds={[]}
      compatibleDrones={compatibleDrones}
    />
  );
}

