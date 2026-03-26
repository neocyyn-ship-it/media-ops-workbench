"use client";

import { Bot, Check, LoaderCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { VoiceInput } from "@/components/voice-input";
import { fetchJson } from "@/lib/client-fetch";
import type { TaskRecord, TaskSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type AssistantAction = {
  id: string;
  suggestion: TaskSuggestion;
  status: "idle" | "saving" | "done" | "error";
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
};

const quickPrompts = [
  "帮我拆今天最重要的 3 个任务",
  "根据当前排期，给我一版直播预告文案",
  "把我今天的工作整理成日报模板",
  "结合热点词，给我 5 个下周选题",
];

const storageKey = "media-ops-assistant-history";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "我是你的 AI 运营助理，可以帮你拆任务、写直播预告、整理日报。你也可以直接点语音输入，用说的告诉我。",
  },
];

function normalizeMessage(content: string) {
  return content
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function shouldSuggestTaskActions(message: string) {
  const normalized = message.replace(/\s+/g, "");
  return /(任务|待办|安排|跟进|今天|明天|下周|直播|对货|脚本|拍摄|发布|复盘)/.test(
    normalized,
  );
}

function AssistantMessageBody({ content }: { content: string }) {
  const lines = normalizeMessage(content).split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`space-${index}`} className="h-2" />;
        }

        const displayText = trimmed
          .replace(/^-\s+/, "• ")
          .replace(/^(\d+)\.\s+/, "$1. ");

        return (
          <p
            key={`${displayText}-${index}`}
            className={cn(
              "text-sm leading-7 text-slate-800",
              /^(总结|建议|下一步|可直接执行|直播预告|日报模板|标题建议|内容结构)/.test(trimmed)
                ? "font-semibold text-slate-900"
                : "",
            )}
          >
            {displayText}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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

  async function requestAssistantReply(message: string) {
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

    return data.reply;
  }

  async function requestTaskSuggestions(message: string) {
    if (!shouldSuggestTaskActions(message)) {
      return [];
    }

    try {
      const response = await fetchJson<{ suggestions: TaskSuggestion[] }>("/api/assist/tasks", {
        method: "POST",
        body: JSON.stringify({ input: message }),
      });
      return response.suggestions.slice(0, 4);
    } catch {
      return [];
    }
  }

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
      const [reply, suggestions] = await Promise.all([
        requestAssistantReply(message),
        requestTaskSuggestions(message),
      ]);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          actions: suggestions.map((suggestion) => ({
            id: crypto.randomUUID(),
            suggestion,
            status: "idle" as const,
          })),
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

  async function createTaskFromSuggestion(messageId: string, actionId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              actions: message.actions?.map((action) =>
                action.id === actionId ? { ...action, status: "saving", error: undefined } : action,
              ),
            },
      ),
    );

    const targetMessage = messages.find((message) => message.id === messageId);
    const targetAction = targetMessage?.actions?.find((action) => action.id === actionId);
    if (!targetAction) return;

    try {
      await fetchJson<TaskRecord>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...targetAction.suggestion,
          cadence: "ONE_OFF",
          owner: targetAction.suggestion.owner ?? "",
        }),
      });

      setMessages((current) =>
        current.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                actions: message.actions?.map((action) =>
                  action.id === actionId ? { ...action, status: "done", error: undefined } : action,
                ),
              },
        ),
      );
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : "加入任务列表失败。";
      setMessages((current) =>
        current.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                actions: message.actions?.map((action) =>
                  action.id === actionId
                    ? { ...action, status: "error", error: messageText }
                    : action,
                ),
              },
        ),
      );
    }
  }

  function resetChat() {
    setMessages(initialMessages);
    setError("");
    window.localStorage.setItem(storageKey, JSON.stringify(initialMessages));
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="panel w-[min(96vw,420px)] overflow-hidden border bg-[color:var(--panel)]">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
            <div>
              <div className="tiny-label">AI Assistant</div>
              <div className="mt-1 text-lg font-semibold">AI 运营助理</div>
              <div className="mt-1 text-sm muted-text">
                先帮你看任务和排期，再把能落地的内容往站内任务里推。
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

          <div ref={listRef} className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("space-y-2", message.role === "user" ? "items-end" : "")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-[22px] px-4 py-3",
                    message.role === "user"
                      ? "ml-auto bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                      : "bg-white/90",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AssistantMessageBody content={message.content} />
                  ) : (
                    <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {message.role === "assistant" && message.actions?.length ? (
                  <div className="space-y-2 pl-1">
                    <div className="text-xs font-medium text-slate-500">可直接加入任务列表</div>
                    {message.actions.map((action) => (
                      <div key={action.id} className="rounded-2xl border bg-white/80 px-3 py-3">
                        <div className="text-sm font-medium">{action.suggestion.title}</div>
                        <div className="mt-1 text-xs muted-text">
                          {action.suggestion.dueAt ? `截止 ${action.suggestion.dueAt}` : "未识别截止时间"}
                        </div>
                        {action.error ? (
                          <div className="mt-2 text-xs text-rose-700">{action.error}</div>
                        ) : null}
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            className="button-secondary gap-2 text-xs"
                            disabled={action.status === "saving" || action.status === "done"}
                            onClick={() => void createTaskFromSuggestion(message.id, action.id)}
                          >
                            {action.status === "saving" ? (
                              <>
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                加入中
                              </>
                            ) : action.status === "done" ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                已加入
                              </>
                            ) : (
                              "加入任务"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">口述也可以，先说重点我来整理</div>
                <div className="mt-2">
                  <VoiceInput
                    onTranscript={(text) => {
                      setInput(text);
                      void sendMessage(text);
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">识别完成后会自动发送给 AI</div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <textarea
                className="min-h-24"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="比如：明天下午 3 点和主播对搭配，早上先对货，再出直播预告脚本"
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
  );
}
