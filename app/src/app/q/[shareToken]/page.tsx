import { redirect } from "next/navigation";

// Public entry: allow customers to open share links without locale prefix.
// This route MUST remain public (no auth).
export default async function PublicShareRedirect({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  redirect(`/zh/q/${encodeURIComponent(shareToken)}`);
}

