"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import { TOPIC_TYPE_LABELS, TOPIC_TYPE_OPTIONS } from "@/lib/options";
import { topicTone } from "@/lib/presentation";
import type { HotTopicRecord, TopicType, TopicWindow } from "@/lib/types";
import { formatDateOnly, isThisWeekIso, isTodayIso, toDatetimeLocalValue } from "@/lib/utils";

const initialForm = {
  keyword: "",
  type: "TREND" as TopicType,
  source: "",
  happenedAt: "",
  usableDirection: "",
};

export function HotTopicsClient({ initialItems }: { initialItems: HotTopicRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [windowMode, setWindowMode] = useState<TopicWindow>("today");
  const [message, setMessage] = useState("");

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

  return (
    <div className="space-y-5">
      <PageHeading
        title="热点词 / 周话题"
        description="收集今天和本周可用的场景词、情绪词、人群词和热点词，也能直接回改。"
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

      <div className="grid-panels xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">{editingId ? "编辑热点" : "新增热点"}</h3>
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
            {message ? <span className="self-center text-sm muted-text">{message}</span> : null}
          </div>
        </SectionCard>

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
    </div>
  );
}
