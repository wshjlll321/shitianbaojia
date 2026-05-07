"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyInviteUrl({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const origin = envBase || window.location.origin;
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
      title={copied ? "已复制" : "复制完整链接"}
      style={{ padding: "6px 10px" }}
    >
      {copied ? <Check size={12} /> : <Link2 size={12} />}
      {copied ? "已复制" : "链接"}
    </button>
  );
}
