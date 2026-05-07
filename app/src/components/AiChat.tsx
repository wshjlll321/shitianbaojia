"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string; ts?: number };

export default function AiChat({
  scope,
  scopeKey,
  initialMessages = [],
  greeting,
  fabBottom,
}: {
  scope: "invite" | "quote";
  scopeKey: string;
  initialMessages?: Msg[];
  greeting?: string;
  /** 浮动按钮距底部的距离（px）。客户向导页有底部固定操作栏，应传 ~80。默认 20。 */
  fabBottom?: number;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // quote 模式：sessionId 只在客户端内存中保留，刷新即失
  const [clientSessionId, setClientSessionId] = useState<string>("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      // 移动端打开时不强制聚焦避免直接弹键盘
      if (typeof window !== "undefined" && window.innerWidth > 520) {
        inputRef.current.focus();
      }
    }
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setErr(null);
    const userMsg: Msg = { role: "user", content: text, ts: Date.now() };
    // 同时插入一个空白 assistant 占位，用于流式追加
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "", ts: Date.now() }]);
    setLoading(true);

    let assistantText = "";
    let firstChunkArrived = false;

    const appendDelta = (delta: string) => {
      if (!delta) return;
      assistantText += delta;
      firstChunkArrived = true;
      setMessages((p) => {
        const next = [...p];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = { ...last, content: assistantText };
        }
        return next;
      });
    };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          scope,
          scopeKey,
          sessionId: scope === "quote" ? clientSessionId : undefined,
        }),
      });

      // 4xx/5xx + 非 SSE 时返回的是 JSON
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || `请求失败 (${res.status})`);
        // 把空 assistant 占位移除
        setMessages((p) => {
          const next = [...p];
          if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content) {
            next.pop();
          }
          return next;
        });
        return;
      }

      if (!res.body) {
        setErr("响应体为空");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamErr: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let sepIdx;
        while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
          const eventBlock = buf.slice(0, sepIdx);
          buf = buf.slice(sepIdx + 2);
          let dataStr = "";
          for (const line of eventBlock.split("\n")) {
            const t = line.trim();
            if (t.startsWith("data:")) dataStr += t.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            const event = JSON.parse(dataStr);
            if (event.delta) appendDelta(event.delta);
            if (event.sessionId && scope === "quote") {
              setClientSessionId(event.sessionId);
            }
            if (event.error) streamErr = event.error;
          } catch {
            // 忽略解析失败
          }
        }
      }

      if (streamErr) {
        setErr(streamErr);
        // 如果完全没拿到任何内容，移除空占位
        if (!firstChunkArrived) {
          setMessages((p) => {
            const next = [...p];
            if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content) {
              next.pop();
            }
            return next;
          });
        }
      } else if (!firstChunkArrived) {
        // 流结束但什么都没拿到
        setErr("AI 没有返回内容，请重试");
        setMessages((p) => {
          const next = [...p];
          if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content) {
            next.pop();
          }
          return next;
        });
      }
    } catch (e) {
      console.error(e);
      setErr("网络错误，请稍后重试");
      if (!firstChunkArrived) {
        setMessages((p) => {
          const next = [...p];
          if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content) {
            next.pop();
          }
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const showGreeting = greeting && messages.length === 0;

  return (
    <>
      <style>{styles}</style>

      {/* 浮动按钮 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开 AI 助手"
        className={`ai-fab ${open ? "ai-fab-hidden" : ""}`}
        style={fabBottom ? { bottom: `${fabBottom}px` } : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="ai-fab-label">AI 助手</span>
      </button>

      {/* 聊天面板 */}
      {open && (
        <div className="ai-overlay" onClick={() => setOpen(false)}>
          <div className="ai-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ai-head">
              <div className="ai-head-left">
                <div className="ai-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" />
                    <rect x="6" y="8" width="12" height="12" rx="3" />
                    <path d="M9 14h0M15 14h0" />
                  </svg>
                </div>
                <div>
                  <div className="ai-title">AI 选购助手</div>
                  <div className="ai-sub">为您推荐合适的机型与配件</div>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ai-close" aria-label="关闭">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="ai-list" ref={listRef}>
              {showGreeting && (
                <div className="ai-greet">
                  <div className="ai-greet-bubble">{greeting}</div>
                </div>
              )}
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const isEmptyAssistant = m.role === "assistant" && !m.content;
                if (isEmptyAssistant && isLast && loading) {
                  return (
                    <div key={i} className="ai-msg ai-msg-assistant">
                      <div className="ai-bubble ai-bubble-thinking">
                        <span>思考中</span>
                        <span className="ai-dots-inline">
                          <span className="ai-dot" />
                          <span className="ai-dot" />
                          <span className="ai-dot" />
                        </span>
                      </div>
                    </div>
                  );
                }
                if (isEmptyAssistant) return null;
                const isStreaming = isLast && m.role === "assistant" && loading;
                return (
                  <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                    <div className="ai-bubble">
                      {m.role === "assistant" ? (
                        <div className="ai-md">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: (props) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="ai-md-tablewrap"><table {...props} /></div>
                              ),
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                          {isStreaming && <span className="ai-cursor" />}
                        </div>
                      ) : (
                        <div>
                          {m.content.split("\n").map((line, idx) => (
                      <div key={idx}>{line || " "}</div>
                    ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {err && <div className="ai-err">{err}</div>}

            <div className="ai-compose">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="请输入您的问题…"
                rows={1}
                className="ai-input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                className="ai-send"
                aria-label="发送"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = `
  /* 浮动按钮 */
  .ai-fab {
    position: fixed; bottom: 20px; right: 20px;
    z-index: 9998;
    display: flex; align-items: center; gap: 8px;
    padding: 12px 18px;
    background: linear-gradient(180deg, #D6B265, #A07A2C);
    color: #1f2937;
    border: none; border-radius: 100px;
    box-shadow: 0 8px 24px rgba(160,122,44,0.4),
                0 1px 0 rgba(255,255,255,0.25) inset;
    cursor: pointer;
    font-family: 'Microsoft YaHei', system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.6px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .ai-fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(160,122,44,0.5),
                0 1px 0 rgba(255,255,255,0.3) inset;
  }
  .ai-fab-hidden { display: none; }
  .ai-fab-label { white-space: nowrap; }

  /* 蒙层 */
  .ai-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(11,18,32,0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: flex-end; justify-content: flex-end;
    padding: 20px;
    animation: aiFade 0.18s ease-out;
  }
  @keyframes aiFade { from { opacity: 0 } to { opacity: 1 } }

  /* 面板 */
  .ai-panel {
    width: 100%;
    max-width: 420px;
    height: min(640px, calc(100vh - 40px));
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 30px 80px rgba(0,0,0,0.3);
    animation: aiSlide 0.22s ease-out;
  }
  @keyframes aiSlide {
    from { transform: translateY(20px); opacity: 0 }
    to { transform: translateY(0); opacity: 1 }
  }

  /* 顶部 */
  .ai-head {
    background: #1f2937;
    color: #fff;
    padding: 14px 16px;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #A07A2C;
  }
  .ai-head-left { display: flex; align-items: center; gap: 10px; }
  .ai-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(180deg, #D6B265, #A07A2C);
    color: #1f2937;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ai-title { font-size: 0.95rem; font-weight: 700; }
  .ai-sub { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
  .ai-close {
    background: transparent; border: none; color: #94a3b8;
    cursor: pointer; padding: 6px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: all 0.15s;
  }
  .ai-close:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* 消息列表 */
  .ai-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f5f5f2;
    display: flex; flex-direction: column; gap: 12px;
  }
  .ai-greet { display: flex; }
  .ai-greet-bubble {
    background: #fffaef;
    border: 1px dashed rgba(160,122,44,0.3);
    color: #6b5128;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 0.88rem;
    line-height: 1.6;
    max-width: 90%;
  }
  .ai-msg { display: flex; }
  .ai-msg-user { justify-content: flex-end; }
  .ai-msg-assistant { justify-content: flex-start; }
  .ai-bubble {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 0.9rem;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  /* 用户气泡保留 \n 折行 */
  .ai-msg-user .ai-bubble { white-space: pre-wrap; }

  /* ── Markdown 渲染样式 ── */
  .ai-md {
    /* 内部由 ReactMarkdown 渲染，需要恢复一些块元素的默认表现 */
  }
  .ai-md > :first-child { margin-top: 0; }
  .ai-md > :last-child { margin-bottom: 0; }

  .ai-md p { margin: 0 0 0.6em; }
  .ai-md h1, .ai-md h2, .ai-md h3, .ai-md h4 {
    margin: 0.8em 0 0.4em;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.35;
  }
  .ai-md h1 { font-size: 1.05rem; }
  .ai-md h2 { font-size: 1rem; }
  .ai-md h3, .ai-md h4 { font-size: 0.95rem; }

  .ai-md strong { color: #1f2937; font-weight: 700; }
  .ai-md em { font-style: italic; color: #374151; }
  .ai-md del { color: #94a3b8; text-decoration: line-through; }

  .ai-md ul, .ai-md ol {
    margin: 0 0 0.6em;
    padding-left: 22px;
  }
  .ai-md li { margin: 0.15em 0; }
  .ai-md li > p { margin: 0; }
  .ai-md li::marker { color: #A07A2C; font-weight: 700; }

  .ai-md a {
    color: #A07A2C; text-decoration: underline;
    text-underline-offset: 2px;
  }
  .ai-md a:hover { color: #6b5128; }

  .ai-md blockquote {
    margin: 0.4em 0;
    padding: 4px 12px;
    border-left: 3px solid #D6B265;
    color: #4b5563;
    background: rgba(160,122,44,0.06);
    border-radius: 0 6px 6px 0;
  }
  .ai-md blockquote > :last-child { margin-bottom: 0; }

  .ai-md code {
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 0.85em;
    background: rgba(0,0,0,0.06);
    padding: 1px 5px;
    border-radius: 4px;
    color: #1f2937;
  }
  .ai-md pre {
    margin: 0.5em 0;
    padding: 10px 12px;
    background: #1f2937;
    color: #f5f5f2;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .ai-md pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
  }

  .ai-md hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 0.8em 0;
  }

  .ai-md-tablewrap {
    overflow-x: auto;
    margin: 0.5em 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
  .ai-md table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .ai-md th, .ai-md td {
    border: 1px solid #e5e7eb;
    padding: 6px 10px;
    text-align: left;
  }
  .ai-md th {
    background: #f3f4f6;
    font-weight: 700;
    color: #1f2937;
  }
  .ai-md tr:nth-child(2n) td { background: #fafaf7; }

  /* 任务列表（GFM） */
  .ai-md input[type="checkbox"] {
    margin-right: 6px;
    accent-color: #A07A2C;
  }
  .ai-msg-user .ai-bubble {
    background: #1f2937; color: #fff;
    border-bottom-right-radius: 4px;
  }
  .ai-msg-assistant .ai-bubble {
    background: #fff; color: #1f2937;
    border: 1px solid #e5e7eb;
    border-bottom-left-radius: 4px;
  }
  .ai-bubble-loading {
    display: flex; gap: 4px; padding: 14px 16px;
  }
  .ai-bubble-thinking {
    display: flex; align-items: center; gap: 8px;
    color: #6b7280;
    font-style: normal;
  }
  .ai-bubble-thinking > span:first-child {
    font-size: 0.88rem;
    letter-spacing: 0.5px;
  }
  .ai-dots-inline {
    display: inline-flex; gap: 3px; align-items: center;
  }
  /* 流式回答时尾部跳动光标 */
  .ai-cursor {
    display: inline-block;
    width: 7px; height: 1.05em;
    background: #A07A2C;
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: aiCursor 1s steps(2) infinite;
    border-radius: 1px;
  }
  @keyframes aiCursor {
    0%, 50% { opacity: 1 }
    51%, 100% { opacity: 0 }
  }
  .ai-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #A07A2C;
    animation: aiDot 1.2s infinite ease-in-out;
  }
  .ai-dot:nth-child(2) { animation-delay: 0.2s; }
  .ai-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes aiDot {
    0%, 60%, 100% { transform: scale(0.8); opacity: 0.4 }
    30% { transform: scale(1.2); opacity: 1 }
  }

  /* 错误 */
  .ai-err {
    background: #fef2f2; color: #dc2626;
    border-top: 1px solid #fecaca;
    padding: 8px 16px; font-size: 0.82rem;
    text-align: center;
  }

  /* 输入区 */
  .ai-compose {
    display: flex; align-items: flex-end; gap: 8px;
    padding: 12px;
    border-top: 1px solid #e5e7eb;
    background: #fff;
  }
  .ai-input {
    flex: 1;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.9rem;
    line-height: 1.5;
    font-family: 'Microsoft YaHei', system-ui, sans-serif;
    color: #1f2937;
    resize: none;
    max-height: 120px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ai-input:focus { border-color: #A07A2C; box-shadow: 0 0 0 3px rgba(160,122,44,0.1); }
  .ai-input:disabled { background: #f9fafb; color: #9ca3af; }
  .ai-send {
    width: 40px; height: 40px;
    border-radius: 10px;
    border: none;
    background: #1f2937;
    color: #fff;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .ai-send:disabled { background: #d1d5db; cursor: not-allowed; }
  .ai-send:not(:disabled):hover { transform: scale(1.05); }

  /* 移动端 */
  @media (max-width: 520px) {
    .ai-fab { bottom: 16px; right: 16px; padding: 11px 14px; font-size: 0.82rem; }
    .ai-fab-label { display: none; }
    .ai-overlay { padding: 0; align-items: stretch; }
    .ai-panel {
      max-width: none;
      width: 100%;
      height: 100vh; height: 100dvh;
      border-radius: 0;
    }
    .ai-bubble { max-width: 88%; font-size: 0.88rem; }
  }
`;
