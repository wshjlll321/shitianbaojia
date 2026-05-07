import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { createHash } from "crypto";
import { getPublicAppBaseUrl } from "@/lib/publicAppUrl";

function sha256Base64Url(input: string) {
  return createHash("sha256").update(input, "utf8").digest("base64url");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get("locale") || "zh").toLowerCase() === "en" ? "en" : "zh";

  // Ensure quote exists (avoid generating QR for invalid tokens)
  const tokenHash = sha256Base64Url(shareToken);
  const quote = await prisma.quote.findFirst({
    where: {
      OR: [{ shareTokenHash: tokenHash }, { shareToken }],
    },
    select: { quoteNumber: true },
  });
  if (!quote) return new NextResponse("Quote Not Found", { status: 404 });

  const base = getPublicAppBaseUrl(request);
  const url = `${base}/${locale}/q/${shareToken}`;

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      margin: 1,
      width: 900,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="QR-${quote.quoteNumber}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("QR Generate error:", e);
    return new NextResponse("Failed to generate QR", { status: 500 });
  }
}

export const runtime = "nodejs";

