import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamBailianApp } from "@/lib/bailian";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

type Msg = { role: "user" | "assistant"; content: string; ts: number };

function safeParseMessages(s: string): Msg[] {
  try {
    const v = JSON.parse(s || "[]");
    if (Array.isArray(v)) {
      return v
        .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content),
          ts: Number(m.ts) || Date.now(),
        }));
    }
  } catch {}
  return [];
}

const MAX_PERSIST = 60;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid body");
  }

  const message = String(body?.message ?? "").trim();
  const scope = body?.scope as "invite" | "quote" | undefined;
  const scopeKey = String(body?.scopeKey ?? "");
  const clientSessionId: string | undefined = body?.sessionId;

  if (!message) return jsonError("message is required");
  if (!scope || !["invite", "quote"].includes(scope)) return jsonError("invalid scope");
  if (!scopeKey) return jsonError("scopeKey required");

  // 校验邀请码（放在 stream 开始前，能直接返回 4xx/410）
  let initialSessionId: string | null = null;
  let inviteCodeUpper = "";
  if (scope === "invite") {
    inviteCodeUpper = scopeKey.toUpperCase();
    const inv = await prisma.inviteCode.findUnique({ where: { code: inviteCodeUpper } });
    if (!inv) return jsonError("invite not found", 404);
    if (inv.status === "revoked") return jsonError("邀请码已作废", 410);
    if (inv.expiresAt < new Date()) return jsonError("邀请码已过期", 410);
    initialSessionId = inv.aiSessionId || null;
  } else {
    initialSessionId = clientSessionId || null;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      let accumulated = "";
      let finalSessionId = initialSessionId || "";

      try {
        for await (const chunk of streamBailianApp({
          prompt: message,
          sessionId: initialSessionId,
        })) {
          if (chunk.sessionId) finalSessionId = chunk.sessionId;
          if (chunk.delta) {
            accumulated += chunk.delta;
            send({ delta: chunk.delta });
          }
          if (chunk.done) {
            // 邀请码：把本轮对话持久化
            if (scope === "invite" && accumulated) {
              try {
                const inv2 = await prisma.inviteCode.findUnique({ where: { code: inviteCodeUpper } });
                if (inv2) {
                  const prev = safeParseMessages(inv2.aiMessages);
                  const updated: Msg[] = [
                    ...prev,
                    { role: "user" as const, content: message, ts: Date.now() },
                    { role: "assistant" as const, content: accumulated, ts: Date.now() },
                  ].slice(-MAX_PERSIST);
                  await prisma.inviteCode.update({
                    where: { code: inviteCodeUpper },
                    data: {
                      aiSessionId: finalSessionId || null,
                      aiMessages: JSON.stringify(updated),
                    },
                  });
                }
              } catch (e) {
                console.error("save AI history failed:", e);
              }
            }
            send({ done: true, sessionId: finalSessionId });
          }
        }
        controller.close();
      } catch (e: any) {
        console.error("AI stream error:", e);
        const msg =
          e?.name === "TimeoutError" || e?.name === "AbortError"
            ? "AI 响应超时，请重试"
            : e?.message || "AI 服务调用失败";
        send({ error: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 nginx 缓冲，确保流式发到客户端
    },
  });
}
