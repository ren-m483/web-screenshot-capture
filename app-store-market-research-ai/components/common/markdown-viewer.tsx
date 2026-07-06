"use client";

import { useState } from "react";

export function MarkdownViewer({ content, title }: { content: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-black/5 dark:bg-white/5">
        <span className="text-sm font-medium">{title ?? "Markdown"}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black hover:opacity-80"
        >
          {copied ? "コピーしました" : "Markdownをコピー"}
        </button>
      </div>
      <pre className="p-3 text-xs whitespace-pre-wrap max-h-[32rem] overflow-y-auto">{content}</pre>
    </div>
  );
}
