import { redirect } from "next/navigation";

// Public shortcut: /q/:token/pdf -> /api/quote/:token/pdf
export default async function PublicSharePdfRedirect({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  redirect(`/api/quote/${encodeURIComponent(shareToken)}/pdf?locale=zh`);
}

