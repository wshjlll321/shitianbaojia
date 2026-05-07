"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
        fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: "#f8fafc",
              fontWeight: 900,
              letterSpacing: "-0.5px",
            }}
          >
            ST
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#f8fafc", margin: 0 }}>世天航空 · 数字化报价系统</h1>
          <p style={{ marginTop: "8px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.6 }}>
            请使用企业邮箱登录。如需开通账号，请联系管理员在「账号管理」中创建。
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "16px",
            padding: "22px 18px",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 14px" }}>登录</h2>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="username" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1" }}>
                账号
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="例如：admin / lintao"
                style={{
                  padding: "12px 12px",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="password" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1" }}>
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="请输入密码"
                style={{
                  padding: "12px 12px",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                marginTop: "6px",
                padding: "12px 12px",
                background: "#f8fafc",
                color: "#0b1220",
                border: "none",
                borderRadius: "12px",
                fontSize: "0.92rem",
                fontWeight: 900,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.65 : 1,
              }}
            >
              {isPending ? "登录中…" : "进入系统"}
            </button>

            {errorMessage && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  borderRadius: "12px",
                  color: "#fecaca",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </div>
            )}
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.72rem", color: "#64748b" }}>© 2026 世天航空 · 内部系统</p>
      </div>
    </div>
  );
}
