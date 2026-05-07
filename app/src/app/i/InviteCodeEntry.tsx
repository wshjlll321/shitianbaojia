"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 与邀请码生成器字符集严格一致：去除 0/O、1/I 易混字符
function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^2-9A-Z]/g, "")
    .slice(0, 8);
}

export default function InviteCodeEntry({
  logoUrl,
  brandName,
}: {
  logoUrl: string;
  brandName: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = code.length >= 6 && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/invites/${code}`, { cache: "no-store" });
      if (res.ok || res.status === 410) {
        router.push(`/i/${code}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "邀请码不存在，请检查后重试");
    } catch {
      setErr("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <html lang="zh">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0B1220" />
        <title>{brandName} · 邀请码</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html, body { -webkit-text-size-adjust: 100%; }
          input, button { font-family: inherit; }

          .invite-page {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            position: relative;
            z-index: 1;
          }
          .invite-brand {
            margin-bottom: 36px;
            text-align: center;
          }
          .invite-brand img {
            height: 64px;
            max-width: 260px;
            object-fit: contain;
          }
          .invite-card {
            max-width: 480px;
            width: 100%;
            background: rgba(31, 41, 55, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 18px;
            padding: 44px 40px 36px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4),
              0 1px 0 rgba(255, 255, 255, 0.05) inset;
          }
          .invite-card::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, #D6B265 30%, #D6B265 70%, transparent);
          }
          .invite-pill {
            display: inline-block;
            font-size: 0.7rem; letter-spacing: 2.5px;
            color: #D6B265; font-weight: 700;
            padding: 5px 14px;
            background: rgba(160, 122, 44, 0.15);
            border: 1px solid rgba(160, 122, 44, 0.3);
            border-radius: 100px;
            margin-bottom: 16px;
          }
          .invite-title {
            margin: 0 0 10px;
            font-size: 1.6rem; color: #f5f5f2;
            letter-spacing: 0.3px; font-weight: 700;
          }
          .invite-desc {
            margin: 0 0 32px;
            color: #94a3b8; font-size: 0.9rem; line-height: 1.6;
          }
          .invite-meta {
            display: flex; justify-content: space-between; align-items: baseline;
            margin-bottom: 10px;
          }
          .invite-input {
            width: 100%;
            padding: 20px 18px;
            border-radius: 12px;
            font-size: 1.5rem;
            font-family: 'Courier New', monospace;
            letter-spacing: 8px;
            text-align: center;
            background: rgba(11, 18, 32, 0.7);
            color: #f5f5f2;
            outline: none;
            font-weight: 700;
            transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            caret-color: #D6B265;
          }
          .invite-error {
            margin-top: 14px;
            padding: 10px 14px;
            background: rgba(220, 38, 38, 0.1);
            color: #fca5a5;
            border-left: 3px solid #dc2626;
            border-radius: 6px;
            font-size: 0.85rem;
          }
          .invite-btn {
            width: 100%;
            margin-top: 22px;
            padding: 16px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            letter-spacing: 1.5px;
            transition: all 0.15s;
          }
          .invite-foot {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 0.78rem;
            color: #64748b;
            text-align: center;
            line-height: 1.7;
          }
          .invite-sig {
            margin-top: 32px;
            font-size: 0.7rem;
            color: #475569;
            letter-spacing: 2px;
            text-align: center;
          }

          /* ─── 移动端适配 ─── */
          @media (max-width: 520px) {
            .invite-page { padding: 32px 16px 28px; }
            .invite-brand { margin-bottom: 24px; }
            .invite-brand img { height: 48px; max-width: 200px; }
            .invite-card { padding: 32px 22px 28px; border-radius: 16px; }
            .invite-pill { font-size: 0.65rem; letter-spacing: 1.8px; padding: 4px 11px; margin-bottom: 12px; }
            .invite-title { font-size: 1.35rem; }
            .invite-desc { font-size: 0.85rem; margin-bottom: 24px; }
            .invite-input { padding: 16px 12px; font-size: 1.2rem; letter-spacing: 5px; }
            .invite-btn { padding: 14px; font-size: 0.9rem; letter-spacing: 1px; }
            .invite-foot { font-size: 0.72rem; margin-top: 24px; padding-top: 16px; }
            .invite-sig { margin-top: 24px; font-size: 0.65rem; }
          }
          @media (max-width: 360px) {
            .invite-card { padding: 26px 18px 22px; }
            .invite-input { font-size: 1.05rem; letter-spacing: 4px; }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "'Microsoft YaHei', system-ui, -apple-system, sans-serif",
          background: "#0B1220",
          color: "#f5f5f2",
        }}
      >
        {/* 深色背景多层光斑 */}
        <div
          style={{
            position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `
              radial-gradient(ellipse 700px 500px at 18% 22%, rgba(160,122,44,0.18), transparent 60%),
              radial-gradient(ellipse 600px 400px at 82% 78%, rgba(59,130,246,0.06), transparent 55%),
              radial-gradient(ellipse 900px 600px at 50% 110%, rgba(160,122,44,0.05), transparent 55%)
            `,
          }}
        />
        <div
          style={{
            position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        <div className="invite-page">
          <div className="invite-brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} />
            ) : (
              <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "4px" }}>
                {brandName}
              </div>
            )}
          </div>

          <div className="invite-card">
            <div className="invite-pill">QUOTATION INVITATION</div>
            <h1 className="invite-title">输入您的邀请码</h1>
            <p className="invite-desc">
              填写销售经理为您专属生成的 8 位邀请码，开始或查看您的报价单。
            </p>

            <form onSubmit={submit} noValidate>
              <div className="invite-meta">
                <label
                  style={{
                    fontSize: "0.7rem", color: "#94a3b8",
                    letterSpacing: "1.8px", fontWeight: 700,
                  }}
                >
                  INVITE CODE
                </label>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: code.length >= 6 ? "#D6B265" : "#64748b",
                    letterSpacing: "1px", fontWeight: 600,
                  }}
                >
                  {code.length} / 8
                </span>
              </div>

              <input
                type="text"
                inputMode="text"
                value={code}
                onChange={(e) => setCode(normalize(e.target.value))}
                onPaste={(e) => {
                  e.preventDefault();
                  setCode(normalize(e.clipboardData.getData("text")));
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                className="invite-input"
                style={{
                  border: `2px solid ${
                    err
                      ? "rgba(220,38,38,0.7)"
                      : code.length >= 6
                      ? "rgba(214,178,101,0.7)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  boxShadow:
                    code.length >= 6
                      ? "0 0 0 4px rgba(214,178,101,0.08)"
                      : "0 0 0 4px rgba(255,255,255,0)",
                }}
              />

              {err && <div className="invite-error">{err}</div>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="invite-btn"
                style={{
                  background: canSubmit
                    ? "linear-gradient(180deg, #D6B265, #A07A2C)"
                    : "rgba(255,255,255,0.06)",
                  color: canSubmit ? "#1f2937" : "#64748b",
                  border: canSubmit ? "none" : "1px solid rgba(255,255,255,0.05)",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  boxShadow: canSubmit
                    ? "0 8px 20px rgba(160,122,44,0.3), 0 1px 0 rgba(255,255,255,0.2) inset"
                    : "none",
                }}
              >
                {loading ? "正在校验..." : "进 入"}
              </button>
            </form>

            <div className="invite-foot">
              没有邀请码？请联系您的销售经理。
              <br />
              邀请码用过一次后，再次输入可查看已生成的报价单。
            </div>
          </div>

          <div className="invite-sig">POWERED BY {brandName.toUpperCase()}</div>
        </div>
      </body>
    </html>
  );
}
