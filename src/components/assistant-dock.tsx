"use client";

import { Bot, LoaderCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const quickPrompts = [
  "帮我拆今天最重要的 3 个任务",
  "根据当前排期，给我一版直播预告文案",
  "把我今天的工作整理成日报模板",
  "结合热点词，给我 5 个下周选题",
];

const storageKey = "media-ops-assistant-history";

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "我是你的 AI 运营助理，可以帮你拆任务、写直播预告、整理日报，默认会参考站内已有任务和排期。",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length) {
        setMessages(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || "AI 助理暂时不可用。");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply!,
        },
      ]);
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : "AI 助理暂时不可用。";
      setError(messageText);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `现在还没成功调用 AI：${messageText}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    const initial = [
      {
        id: "welcome",
        role: "assistant" as const,
        content:
          "我是你的 AI 运营助理，可以帮你拆任务、写直播预告、整理日报，默认会参考站内已有任务和排期。",
      },
    ];
    setMessages(initial);
    setError("");
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {open ? (
          <div className="panel w-[min(96vw,420px)] overflow-hidden border bg-[color:var(--panel)]">
            <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <div className="tiny-label">AI Assistant</div>
                <div className="mt-1 text-lg font-semibold">AI 运营助理</div>
                <div className="mt-1 text-sm muted-text">
                  基于当前任务、排期和热点词给你建议
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border bg-white/80 p-2"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={listRef} className="max-h-[50vh] space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                      : "bg-white/90",
                  )}
                >
                  {message.content}
                </div>
              ))}
              {loading ? (
                <div className="inline-flex items-center gap-2 rounded-[22px] bg-white/90 px-4 py-3 text-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  AI 正在整理你的工作台信息...
                </div>
              ) : null}
            </div>

            <div className="border-t px-4 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border bg-white/80 px-3 py-1.5 text-xs font-medium"
                    onClick={() => void sendMessage(prompt)}
                    disabled={loading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <textarea
                  className="min-h-24"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="比如：根据我这周排期，帮我补一版清明节前的直播预热脚本"
                />
              </div>

              {error ? <div className="mt-3 text-xs text-rose-700">{error}</div> : null}

              <div className="mt-3 flex items-center justify-between gap-3">
                <button type="button" className="text-sm muted-text" onClick={resetChat}>
                  清空对话
                </button>
                <button
                  type="button"
                  className="button-primary gap-2"
                  onClick={() => void sendMessage(input)}
                  disabled={!canSend}
                >
                  <SendHorizontal className="h-4 w-4" />
                  发送
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="button-primary gap-2 px-5 py-3 shadow-[var(--shadow)]"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          {open ? "收起助理" : "AI 运营助理"}
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
