"use client";

import { Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import {
  CONTENT_TYPE_LABELS,
  TOPIC_TYPE_LABELS,
  TOPIC_TYPE_OPTIONS,
} from "@/lib/options";
import { topicTone } from "@/lib/presentation";
import type {
  ContentType,
  HotTopicRecord,
  HotTopicSuggestion,
  TopicType,
  TopicWindow,
} from "@/lib/types";
import { formatDateOnly, isThisWeekIso, isTodayIso, toDatetimeLocalValue } from "@/lib/utils";

const initialForm = {
  keyword: "",
  type: "TREND" as TopicType,
  source: "",
  happenedAt: "",
  usableDirection: "",
};

function inferPlanType(keyword: string): ContentType {
  if (/直播|预告/.test(keyword)) return "LIVE_TRAILER";
  if (/图文|清单|合集/.test(keyword)) return "CAROUSEL";
  if (/穿搭|look|搭配/.test(keyword)) return "OUTFIT";
  if (/短视频|口播|视频/.test(keyword)) return "SHORT_VIDEO";
  return "SEEDING";
}

function buildPlanPayloadFromTopic(input: {
  keyword: string;
  source: string;
  usableDirection: string;
  contentTitle?: string;
  contentType?: ContentType;
}) {
  return {
    title: input.contentTitle || `${input.keyword}切成一条可拍的内容选题`,
    contentType: input.contentType || inferPlanType(input.keyword),
    audience: "待补充",
    scenario: `热点来源：${input.source}`,
    product: "待补充",
    script: "待补充",
    status: "IDEA",
    workflowStage: "TOPIC",
    calendarLabel: "IDEA_POOL",
    dataNote: input.usableDirection,
    selectionNotes: `热点词：${input.keyword}`,
    businessNotes: null,
    inventoryNotes: null,
    shootDate: null,
    stylingNotes: null,
    cameraNotes: null,
    voiceoverNotes: null,
    assetNotes: null,
    editBrief: null,
    publishAt: null,
  };
}

export function HotTopicsClient({ initialItems }: { initialItems: HotTopicRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [windowMode, setWindowMode] = useState<TopicWindow>("today");
  const [message, setMessage] = useState("");
  const [radarSource, setRadarSource] = useState("小红书热榜 / 群聊 / 搜索联想");
  const [radarInput, setRadarInput] = useState("");
  const [radarResults, setRadarResults] = useState<HotTopicSuggestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const filteredItems = useMemo(() => {
    if (windowMode === "today") {
      return items.filter((item) => isTodayIso(item.happenedAt));
    }
    if (windowMode === "week") {
      return items.filter((item) => isThisWeekIso(item.happenedAt));
    }
    return items;
  }, [items, windowMode]);

  async function saveItem() {
    if (!form.keyword.trim()) {
      setMessage("请先填写关键词。");
      return;
    }

    const payload = {
      ...form,
      happenedAt: form.happenedAt ? new Date(form.happenedAt).toISOString() : null,
    };

    if (editingId) {
      const updated = await fetchJson<HotTopicRecord>(`/api/topics/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setItems((current) => current.map((item) => (item.id === editingId ? updated : item)));
      setEditingId(null);
      setForm(initialForm);
      setMessage("热点已更新。");
      return;
    }

    const created = await fetchJson<HotTopicRecord>("/api/topics", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setItems((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("热点已加入。");
  }

  function startEditing(item: HotTopicRecord) {
    setEditingId(item.id);
    setForm({
      keyword: item.keyword,
      type: item.type,
      source: item.source,
      happenedAt: toDatetimeLocalValue(item.happenedAt),
      usableDirection: item.usableDirection,
    });
    setMessage(`正在编辑「${item.keyword}」`);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("已取消编辑。");
  }

  async function removeItem(item: HotTopicRecord) {
    if (!window.confirm(`确定删除热点「${item.keyword}」吗？`)) return;

    await fetchJson(`/api/topics/${item.id}`, {
      method: "DELETE",
    });
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setForm(initialForm);
    }
    setMessage("热点已删除。");
  }

  async function parseRadarInput() {
    if (!radarInput.trim()) {
      setMessage("先把榜单、聊天记录或搜索词贴进来。");
      return;
    }

    setIsParsing(true);
    setMessage("");
    try {
      const response = await fetchJson<{ suggestions: HotTopicSuggestion[] }>("/api/assist/topics", {
        method: "POST",
        body: JSON.stringify({
          input: radarInput,
          source: radarSource,
        }),
      });
      setRadarResults(response.suggestions);
      setMessage(`已识别 ${response.suggestions.length} 条热点候选。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "热点识别失败。");
    } finally {
      setIsParsing(false);
    }
  }

  async function addSuggestionToPool(suggestion: HotTopicSuggestion) {
    const created = await fetchJson<HotTopicRecord>("/api/topics", {
      method: "POST",
      body: JSON.stringify({
        keyword: suggestion.keyword,
        type: suggestion.type,
        source: suggestion.source,
        usableDirection: suggestion.usableDirection,
        happenedAt: new Date().toISOString(),
      }),
    });

    setItems((current) => [created, ...current]);
    setRadarResults((current) => current.filter((item) => item.keyword !== suggestion.keyword));
    setMessage(`已把「${suggestion.keyword}」加入热点池。`);
  }

  async function createPlanFromSuggestion(suggestion: HotTopicSuggestion) {
    await fetchJson("/api/content", {
      method: "POST",
      body: JSON.stringify(
        buildPlanPayloadFromTopic({
          keyword: suggestion.keyword,
          source: suggestion.source,
          usableDirection: suggestion.usableDirection,
          contentTitle: suggestion.contentTitle,
          contentType: suggestion.contentType,
        }),
      ),
    });
    setMessage(`已从「${suggestion.keyword}」生成一条内容排期。`);
  }

  async function createPlanFromTopic(item: HotTopicRecord) {
    await fetchJson("/api/content", {
      method: "POST",
      body: JSON.stringify(
        buildPlanPayloadFromTopic({
          keyword: item.keyword,
          source: item.source,
          usableDirection: item.usableDirection,
        }),
      ),
    });
    setMessage(`已把「${item.keyword}」送进内容排期。`);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="热点词 / 周话题"
        description="先用热点雷达收集平台趋势，再把它们一键沉淀进热点池或转成内容排期。这样热点不再只是词库，而是内容生产入口。"
        action={
          <div className="flex gap-2">
            {(["today", "week", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={item === windowMode ? "button-primary" : "button-secondary"}
                onClick={() => setWindowMode(item)}
              >
                {item === "today" ? "今天" : item === "week" ? "本周" : "全部"}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid-panels xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-xl font-semibold">AI 热点雷达</h3>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">来源说明</label>
              <input
                value={radarSource}
                onChange={(event) => setRadarSource(event.target.value)}
                placeholder="例如：小红书热榜 / 群聊 / 搜索联想"
              />
            </div>
            <div>
              <label className="field-label">原始热点内容</label>
              <textarea
                className="min-h-40"
                value={radarInput}
                onChange={(event) => setRadarInput(event.target.value)}
                placeholder="把热榜词、平台搜索联想、群消息、手抄选题都贴进来。每行一条最好，也可以是一整段。"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={() => void parseRadarInput()}>
              <Sparkles className="h-4 w-4" />
              {isParsing ? "识别中..." : "识别热点"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setRadarInput("");
                setRadarResults([]);
              }}
            >
              清空
            </button>
            {message ? <span className="self-center text-sm muted-text">{message}</span> : null}
          </div>

          <div className="mt-4 space-y-3">
            {radarResults.length ? (
              radarResults.map((suggestion) => (
                <div key={suggestion.keyword} className="panel-soft p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={topicTone(suggestion.type)}>{TOPIC_TYPE_LABELS[suggestion.type]}</Badge>
                    <Badge>{suggestion.source}</Badge>
                    <Badge tone="warning">热度 {suggestion.heatScore}</Badge>
                    <Badge>{CONTENT_TYPE_LABELS[suggestion.contentType]}</Badge>
                  </div>
                  <div className="mt-3 text-lg font-semibold">{suggestion.keyword}</div>
                  <div className="mt-2 text-sm leading-6 muted-text">{suggestion.usableDirection}</div>
                  <div className="mt-3 rounded-2xl bg-white/80 px-3 py-3 text-sm">
                    <div className="font-medium">建议切入选题</div>
                    <div className="mt-1">{suggestion.contentTitle}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void addSuggestionToPool(suggestion)}
                    >
                      加入热点池
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => void createPlanFromSuggestion(suggestion)}
                    >
                      转成排期
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed px-5 py-10 text-center text-sm muted-text">
                先贴一段热榜、搜索联想或群消息，我会帮你拆成热点词和可执行选题。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">{editingId ? "编辑热点" : "手动新增热点"}</h3>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">关键词</label>
              <input
                value={form.keyword}
                onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">类型</label>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TopicType }))}
              >
                {TOPIC_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">来源</label>
              <input
                value={form.source}
                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">日期</label>
              <input
                type="datetime-local"
                value={form.happenedAt}
                onChange={(event) => setForm((current) => ({ ...current, happenedAt: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">可用方向</label>
              <textarea
                className="min-h-28"
                value={form.usableDirection}
                onChange={(event) =>
                  setForm((current) => ({ ...current, usableDirection: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void saveItem()}>
              {editingId ? "保存修改" : "新增热点"}
            </button>
            {editingId ? (
              <button type="button" className="button-secondary gap-2" onClick={cancelEditing}>
                <X className="h-4 w-4" />
                取消编辑
              </button>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="tiny-label">Topic Pool</div>
            <h3 className="mt-2 text-xl font-semibold">
              {windowMode === "today" ? "今日热点" : windowMode === "week" ? "本周话题" : "全部热点"}
            </h3>
          </div>
          <Badge>{filteredItems.length} 条</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="panel-soft p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={topicTone(item.type)}>{TOPIC_TYPE_LABELS[item.type]}</Badge>
                    <Badge>{item.source}</Badge>
                    <Badge>{formatDateOnly(item.happenedAt)}</Badge>
                  </div>
                  <div className="text-lg font-semibold">{item.keyword}</div>
                  <div className="text-sm leading-6 muted-text">{item.usableDirection}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="button-primary" onClick={() => void createPlanFromTopic(item)}>
                      转排期
                    </button>
                    <button type="button" className="button-secondary gap-2" onClick={() => startEditing(item)}>
                      <Pencil className="h-4 w-4" />
                      编辑
                    </button>
                    <button type="button" className="button-secondary gap-2" onClick={() => void removeItem(item)}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
