import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import InviteCreateForm from "./InviteCreateForm";

export default async function NewInvitePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <InviteCreateForm />;
}
