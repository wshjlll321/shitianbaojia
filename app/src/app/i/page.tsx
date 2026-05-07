import { prisma } from "@/lib/prisma";
import InviteCodeEntry from "./InviteCodeEntry";

export default async function InviteEntryPage() {
  const [logoCfg, nameCfg] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: "company_logo" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "company_name" } }).catch(() => null),
  ]);
  const logoUrl = logoCfg?.value || "";
  const brandName = nameCfg?.value?.trim() || "SHITIAN AVIATION";
  return <InviteCodeEntry logoUrl={logoUrl} brandName={brandName} />;
}
