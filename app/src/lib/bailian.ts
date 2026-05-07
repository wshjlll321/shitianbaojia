/**
 * 阿里百炼应用平台 API 封装
 * 文档：https://help.aliyun.com/zh/model-studio/developer-reference/use-bailian-app-api-via-http
 *
 * 仅在服务端调用（API key 不可暴露到前端）。
 */

const BASE_URL = "https://dashscope.aliyuncs.com/api/v1/apps";

export type BailianResult = {
  text: string;
  sessionId: string;
};

/** 非流式：一次性拿到完整回答 */
export async function callBailianApp({
  prompt,
  sessionId,
  signal,
}: {
  prompt: string;
  sessionId?: string | null;
  signal?: AbortSignal;
}): Promise<BailianResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const appId = process.env.DASHSCOPE_APP_ID;
  if (!apiKey || !appId) {
    throw new Error("DASHSCOPE_API_KEY / DASHSCOPE_APP_ID 未配置");
  }

  const body: any = { input: { prompt }, parameters: {}, debug: {} };
  if (sessionId) body.input.session_id = sessionId;

  const res = await fetch(`${BASE_URL}/${appId}/completion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Bailian API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = stripThinkBlocks(String(data?.output?.text ?? "").trim());
  const newSessionId = String(data?.output?.session_id ?? sessionId ?? "");
  if (!text) throw new Error("Bailian 返回内容为空");
  return { text, sessionId: newSessionId };
}

/** 流式：以 AsyncGenerator 形式逐字返回（已剥离 think 块） */
export async function* streamBailianApp({
  prompt,
  sessionId,
  signal,
}: {
  prompt: string;
  sessionId?: string | null;
  signal?: AbortSignal;
}): AsyncGenerator<{ delta?: string; sessionId?: string; done?: boolean }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const appId = process.env.DASHSCOPE_APP_ID;
  if (!apiKey || !appId) {
    throw new Error("DASHSCOPE_API_KEY / DASHSCOPE_APP_ID 未配置");
  }

  const body: any = {
    input: { prompt },
    // incremental_output: true → 每个 chunk 只携带新增 delta（非累计）
    parameters: { incremental_output: true },
    debug: {},
  };
  if (sessionId) body.input.session_id = sessionId;

  const res = await fetch(`${BASE_URL}/${appId}/completion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-DashScope-SSE": "enable",
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(120_000),
  });

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Bailian SSE ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let lastSid = sessionId || "";
  const stripper = makeThinkStripper();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE 事件以 "\n\n" 分隔；event 行格式：
      //   id:xxx
      //   event:result
      //   data:{...JSON...}
      let sepIdx;
      while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
        const rawEvent = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + 2);

        let dataStr = "";
        for (const line of rawEvent.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            dataStr += trimmed.slice(5).trim();
          }
        }
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr);
          const sid = event?.output?.session_id;
          if (sid) lastSid = sid;
          const rawText = event?.output?.text;
          const finishReason = event?.output?.finish_reason;

          if (typeof rawText === "string" && rawText.length > 0) {
            const cleaned = stripper.feed(rawText);
            if (cleaned) yield { delta: cleaned, sessionId: lastSid };
          }
          if (finishReason && finishReason !== "null") {
            const tail = stripper.flush();
            if (tail) yield { delta: tail, sessionId: lastSid };
            yield { done: true, sessionId: lastSid };
          }
        } catch {
          // 单条事件解析失败不影响整体
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 流式 think 块剥离器
 * 处理 <think>...</think> 和 <thinking>...</thinking>
 * （chunk 可能在标签中间被切断，要在状态间维持半截 buffer）
 */
function makeThinkStripper() {
  // 当前是否在 think 块内
  let inThink = false;
  // 跨 chunk 的待定字符（可能是半截 < / </）
  let pending = "";

  // 最长可能的待匹配前缀长度（足够包容 "</thinking>"）
  const MAX_LOOKBEHIND = "</thinking>".length;

  const tryConsumeOpen = (s: string): { idx: number; len: number } | null => {
    const a = s.indexOf("<think>");
    const b = s.indexOf("<thinking>");
    if (a === -1 && b === -1) return null;
    if (a === -1) return { idx: b, len: 10 };
    if (b === -1) return { idx: a, len: 7 };
    return a < b ? { idx: a, len: 7 } : { idx: b, len: 10 };
  };

  const tryConsumeClose = (s: string): { idx: number; len: number } | null => {
    const a = s.indexOf("</think>");
    const b = s.indexOf("</thinking>");
    if (a === -1 && b === -1) return null;
    if (a === -1) return { idx: b, len: 11 };
    if (b === -1) return { idx: a, len: 8 };
    return a < b ? { idx: a, len: 8 } : { idx: b, len: 11 };
  };

  return {
    feed(chunk: string): string {
      let s = pending + chunk;
      let out = "";
      while (s.length > 0) {
        if (!inThink) {
          const open = tryConsumeOpen(s);
          if (open === null) {
            // 没找到完整 open 标签 → 输出大部分，保留尾部以防半截标签
            if (s.length > MAX_LOOKBEHIND) {
              out += s.slice(0, s.length - MAX_LOOKBEHIND);
              pending = s.slice(s.length - MAX_LOOKBEHIND);
            } else {
              pending = s;
            }
            return out;
          }
          out += s.slice(0, open.idx);
          s = s.slice(open.idx + open.len);
          inThink = true;
        } else {
          const close = tryConsumeClose(s);
          if (close === null) {
            // 在 think 内但没 close 标签 → 全丢，保留尾部以防半截
            if (s.length > MAX_LOOKBEHIND) {
              pending = s.slice(s.length - MAX_LOOKBEHIND);
            } else {
              pending = s;
            }
            return out;
          }
          s = s.slice(close.idx + close.len);
          inThink = false;
        }
      }
      pending = "";
      return out;
    },
    flush(): string {
      // 流结束：剩下的 pending 如果不在 think 块内就输出
      const tail = inThink ? "" : pending;
      pending = "";
      inThink = false;
      return tail;
    },
  };
}

/** 用于非流式调用结果的 think 剥离 */
export function stripThinkBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
    .trim();
}
