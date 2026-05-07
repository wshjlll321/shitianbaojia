import { redirect } from "next/navigation";

// Public shortcut: /q/:token/qrcode -> /api/quote/:token/qrcode
export default async function PublicShareQrRedirect({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  redirect(`/api/quote/${encodeURIComponent(shareToken)}/qrcode?locale=zh`);
}

