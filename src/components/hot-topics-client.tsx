"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import { TOPIC_TYPE_LABELS, TOPIC_TYPE_OPTIONS } from "@/lib/options";
import { topicTone } from "@/lib/presentation";
import type { HotTopicRecord, TopicType, TopicWindow } from "@/lib/types";
import { formatDateOnly, isThisWeekIso, isTodayIso } from "@/lib/utils";

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

  async function createItem() {
    if (!form.keyword.trim()) {
      setMessage("请先填写关键词。");
      return;
    }
    const created = await fetchJson<HotTopicRecord>("/api/topics", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        happenedAt: form.happenedAt ? new Date(form.happenedAt).toISOString() : null,
      }),
    });
    setItems((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("热点词已加入。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="热点词 / 周话题"
        description="收集今天和本周可用的场景词、情绪词、人群词和热点词，直接反哺选题池。"
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
            <h3 className="text-xl font-semibold">新增热点词</h3>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">关键词</label>
              <input value={form.keyword} onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))} />
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
              <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
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
                onChange={(event) => setForm((current) => ({ ...current, usableDirection: event.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void createItem()}>
              新增热点
            </button>
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
