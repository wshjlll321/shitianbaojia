/**
 * 生成「给其他设备访问」的站点根地址（二维码、复制链接等）。
 *
 * 本机用 http://localhost:3000 开发时，手机扫码会连到手机自己的 localhost，无法打开报价页。
 * 请在 .env 中设置其一（不要末尾斜杠）：
 *   PUBLIC_APP_URL=http://192.168.x.x:3000
 *   或 NEXT_PUBLIC_APP_URL=...（与 PDF 渲染一致，且客户端复制链接也可用）
 */
export function getPublicAppBaseUrl(request?: Request): string {
  const fromEnv = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (request) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }

  return "http://127.0.0.1:3000";
}
