"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyLinkButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const origin = envBase || window.location.origin;
    const url = `${origin}/zh/q/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-sm ${copied ? "btn-primary" : "btn-outline"}`}
      title={copied ? "已复制" : "复制分享链接"}
      style={{ minWidth: "36px", padding: "6px 10px" }}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied ? "已复制" : "链接"}
    </button>
  );
}
