import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProductEditorForm from "../[id]/ProductEditorForm";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 用于关联：列出所有在售配件，让创建时就能配置兼容关系
  const allAccessories = await prisma.product.findMany({
    where: { category: "accessory", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // 空白产品占位（id: "new" 触发表单的 create 模式）
  const stubProduct = {
    id: "new",
    model: "",
    nameZh: "",
    nameEn: "",
    nameTh: "",
    category: "drone",
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
      product={stubProduct}
      allAccessories={allAccessories}
      currentAccessoryIds={[]}
      initialSkus={[]}
    />
  );
}
