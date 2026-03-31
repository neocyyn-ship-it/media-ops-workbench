"use client";

import { Bot, Check, Copy, LoaderCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { VoiceInput } from "@/components/voice-input";
import { fetchJson } from "@/lib/client-fetch";
import { CONTENT_STATUS_LABELS, CONTENT_TYPE_LABELS } from "@/lib/options";
import type {
  ContentPlanRecord,
  ContentPlanSuggestion,
  TaskRecord,
  TaskSuggestion,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AssistantAction = {
  id: string;
  suggestion: TaskSuggestion;
  status: "idle" | "saving" | "done" | "error";
  error?: string;
};

type AssistantContentAction = {
  id: string;
  suggestion: ContentPlanSuggestion;
  status: "idle" | "saving" | "done" | "error";
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
  contentActions?: AssistantContentAction[];
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

function toLocalDateTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function fromLocalDateTimeInputValue(value: string) {
  return value ? new Date(value).toISOString() : null;
}

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
  const [copied, setCopied] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

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
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  function appendTranscript(text: string) {
    setInput((current) => {
      const trimmedCurrent = current.trim();
      if (!trimmedCurrent) return text;
      const separator = /[，。！？；]$/.test(trimmedCurrent) ? "" : "，";
      return `${trimmedCurrent}${separator}${text}`;
    });
  }

  function updateTaskSuggestion(
    messageId: string,
    actionId: string,
    updater: (suggestion: TaskSuggestion) => TaskSuggestion,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              actions: message.actions?.map((action) =>
                action.id === actionId
                  ? { ...action, suggestion: updater(action.suggestion), error: undefined }
                  : action,
              ),
            },
      ),
    );
  }

  function updateContentSuggestion(
    messageId: string,
    actionId: string,
    updater: (suggestion: ContentPlanSuggestion) => ContentPlanSuggestion,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              contentActions: message.contentActions?.map((action) =>
                action.id === actionId
                  ? { ...action, suggestion: updater(action.suggestion), error: undefined }
                  : action,
              ),
            },
      ),
    );
  }

  function dismissTaskSuggestion(messageId: string, actionId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              actions: message.actions?.filter((action) => action.id !== actionId),
            },
      ),
    );
  }

  function dismissContentSuggestion(messageId: string, actionId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              contentActions: message.contentActions?.filter((action) => action.id !== actionId),
            },
      ),
    );
  }

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

async function requestContentSuggestions(message: string) {
  if (!shouldSuggestTaskActions(message)) {
    return [];
  }

  try {
    const response = await fetchJson<{ suggestions: ContentPlanSuggestion[] }>(
      "/api/assist/content",
      {
        method: "POST",
        body: JSON.stringify({ input: message }),
      },
    );
    return response.suggestions.slice(0, 3);
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
      const [reply, suggestions, contentSuggestions] = await Promise.all([
        requestAssistantReply(message),
        requestTaskSuggestions(message),
        requestContentSuggestions(message),
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
          contentActions: contentSuggestions.map((suggestion) => ({
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

  async function createContentPlanFromSuggestion(messageId: string, actionId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              contentActions: message.contentActions?.map((action) =>
                action.id === actionId ? { ...action, status: "saving", error: undefined } : action,
              ),
            },
      ),
    );

    const targetMessage = messages.find((message) => message.id === messageId);
    const targetAction = targetMessage?.contentActions?.find((action) => action.id === actionId);
    if (!targetAction) return;

    try {
      await fetchJson<ContentPlanRecord>("/api/content", {
        method: "POST",
        body: JSON.stringify({
          ...targetAction.suggestion,
        }),
      });

      setMessages((current) =>
        current.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                contentActions: message.contentActions?.map((action) =>
                  action.id === actionId ? { ...action, status: "done", error: undefined } : action,
                ),
              },
        ),
      );
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : "加入内容排期失败。";
      setMessages((current) =>
        current.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                contentActions: message.contentActions?.map((action) =>
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

  async function copyConversation() {
    const text = messages
      .map((message) => {
        const role = message.role === "user" ? "我" : "AI";
        return `${role}：${normalizeMessage(message.content)}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError("");
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError("复制失败，请检查浏览器剪贴板权限。");
    }
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-3",
        open ? "inset-0 items-stretch" : "bottom-5 right-5 items-end",
      )}
    >
      {open ? (
        <div className="panel flex h-screen w-screen flex-col overflow-hidden border bg-[color:var(--panel)]">
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

          <div ref={listRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("space-y-2", message.role === "user" ? "items-end" : "")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-[22px] px-4 py-3 select-text",
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
                        <label className="block text-[11px] font-medium text-slate-500">任务内容</label>
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                          value={action.suggestion.title}
                          onChange={(event) =>
                            updateTaskSuggestion(message.id, action.id, (suggestion) => ({
                              ...suggestion,
                              title: event.target.value,
                            }))
                          }
                          disabled={action.status === "saving" || action.status === "done"}
                        />
                        <label className="mt-3 block text-[11px] font-medium text-slate-500">时间</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                          value={toLocalDateTimeInputValue(action.suggestion.dueAt)}
                          onChange={(event) =>
                            updateTaskSuggestion(message.id, action.id, (suggestion) => ({
                              ...suggestion,
                              dueAt: fromLocalDateTimeInputValue(event.target.value),
                            }))
                          }
                          disabled={action.status === "saving" || action.status === "done"}
                        />
                        <div className="mt-2 text-xs muted-text">
                          {action.suggestion.dueAt ? "会按你修改后的时间加入任务" : "可以留空，后续再补时间"}
                        </div>
                        {action.error ? (
                          <div className="mt-2 text-xs text-rose-700">{action.error}</div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-xs text-slate-500 transition hover:text-slate-800"
                            disabled={action.status === "saving" || action.status === "done"}
                            onClick={() => dismissTaskSuggestion(message.id, action.id)}
                          >
                            取消加入
                          </button>
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

                {message.role === "assistant" && message.contentActions?.length ? (
                  <div className="space-y-2 pl-1">
                    <div className="text-xs font-medium text-slate-500">可直接加入内容排期</div>
                    {message.contentActions.map((action) => (
                      <div key={action.id} className="rounded-2xl border bg-white/80 px-3 py-3">
                        <label className="block text-[11px] font-medium text-slate-500">排期内容</label>
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                          value={action.suggestion.title}
                          onChange={(event) =>
                            updateContentSuggestion(message.id, action.id, (suggestion) => ({
                              ...suggestion,
                              title: event.target.value,
                            }))
                          }
                          disabled={action.status === "saving" || action.status === "done"}
                        />
                        <label className="mt-3 block text-[11px] font-medium text-slate-500">排期时间</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                          value={toLocalDateTimeInputValue(action.suggestion.publishAt)}
                          onChange={(event) =>
                            updateContentSuggestion(message.id, action.id, (suggestion) => ({
                              ...suggestion,
                              publishAt: fromLocalDateTimeInputValue(event.target.value),
                            }))
                          }
                          disabled={action.status === "saving" || action.status === "done"}
                        />
                        <div className="mt-1 text-xs muted-text">
                          {CONTENT_TYPE_LABELS[action.suggestion.contentType]} · {CONTENT_STATUS_LABELS[action.suggestion.status]}
                        </div>
                        {action.error ? (
                          <div className="mt-2 text-xs text-rose-700">{action.error}</div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-xs text-slate-500 transition hover:text-slate-800"
                            disabled={action.status === "saving" || action.status === "done"}
                            onClick={() => dismissContentSuggestion(message.id, action.id)}
                          >
                            取消加入
                          </button>
                          <button
                            type="button"
                            className="button-secondary gap-2 text-xs"
                            disabled={action.status === "saving" || action.status === "done"}
                            onClick={() => void createContentPlanFromSuggestion(message.id, action.id)}
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
                              "加入排期"
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

          <div className="border-t px-4 py-3">
            {toolsOpen ? (
              <>
                <div className="mb-2 flex flex-wrap gap-2">
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
                    <div className="text-xs font-medium text-slate-500">
                      口述也可以，先说重点我来整理
                    </div>
                    <div className="mt-2">
                      <VoiceInput
                        onTranscript={(text) => {
                          appendTranscript(text);
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      识别内容会先填进输入框，你确认后再发送
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-2 flex gap-2">
              <textarea
                className="min-h-16"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="比如：明天下午 3 点和主播对搭配，早上先对货，再出直播预告脚本"
              />
            </div>

            {error ? <div className="mt-2 text-xs text-rose-700">{error}</div> : null}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="text-sm muted-text" onClick={resetChat}>
                  清空对话
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm muted-text"
                  onClick={() => void copyConversation()}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "已复制" : "复制对话"}
                </button>
                <button
                  type="button"
                  className="text-sm muted-text"
                  onClick={() => setToolsOpen((current) => !current)}
                >
                  {toolsOpen ? "收起工具" : "展开工具"}
                </button>
              </div>
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
