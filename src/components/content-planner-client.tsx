"use client";

import { Lightbulb, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_OPTIONS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_OPTIONS,
} from "@/lib/options";
import { contentStatusTone } from "@/lib/presentation";
import type { ContentPlanRecord, ContentStatus, ContentSuggestion, ContentType } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const initialForm = {
  title: "",
  contentType: "LIVE_TRAILER" as ContentType,
  audience: "",
  scenario: "",
  product: "",
  script: "",
  publishAt: "",
  status: "IDEA" as ContentStatus,
  dataNote: "",
};

export function ContentPlannerClient({ initialPlans }: { initialPlans: ContentPlanRecord[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState(initialForm);
  const [topic, setTopic] = useState("面试穿搭直播预告");
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null);
  const [message, setMessage] = useState("");

  const groupedPlans = useMemo(() => {
    return [...plans].sort((a, b) => (a.publishAt ?? "").localeCompare(b.publishAt ?? ""));
  }, [plans]);

  async function createPlan() {
    if (!form.title.trim()) {
      setMessage("请先填写选题标题。");
      return;
    }
    const created = await fetchJson<ContentPlanRecord>("/api/content", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      }),
    });
    setPlans((current) => [...current, created]);
    setForm(initialForm);
    setMessage("内容排期已新增。");
  }

  async function generateSuggestion() {
    const response = await fetchJson<{ suggestion: ContentSuggestion }>("/api/content/suggest", {
      method: "POST",
      body: JSON.stringify({ topic }),
    });
    setSuggestion(response.suggestion);
    setMessage("已生成内容结构建议。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="内容排期"
        description="把直播预告、穿搭图文、短视频选题统一排期，同时沉淀脚本和数据回填。"
        action={<a className="button-secondary" href="/api/export/workbook">导出 Excel</a>}
      />

      <div className="grid-panels xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            <h3 className="text-xl font-semibold">内容结构建议</h3>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
            <button type="button" className="button-primary shrink-0" onClick={() => void generateSuggestion()}>
              生成模板
            </button>
          </div>

          {suggestion ? (
            <div className="mt-4 space-y-3">
              <div className="panel-soft p-4">
                <div className="font-medium">标题建议</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                  {suggestion.titles.map((title) => (
                    <li key={title}>- {title}</li>
                  ))}
                </ul>
              </div>
              <div className="panel-soft p-4">
                <div className="font-medium">开头钩子</div>
                <p className="mt-3 text-sm leading-6 muted-text">{suggestion.hook}</p>
              </div>
              <div className="panel-soft p-4">
                <div className="font-medium">卖点与引导语</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                  {suggestion.sellingPoints.map((point) => (
                    <li key={point}>- {point}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-6 text-[color:var(--accent)]">{suggestion.cta}</p>
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">新增内容排期</h3>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">选题标题</label>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <label className="field-label">内容类型</label>
              <select
                value={form.contentType}
                onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as ContentType }))}
              >
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">状态</label>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ContentStatus }))}
              >
                {CONTENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">目标人群</label>
              <input value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))} />
            </div>
            <div>
              <label className="field-label">场景</label>
              <input value={form.scenario} onChange={(event) => setForm((current) => ({ ...current, scenario: event.target.value }))} />
            </div>
            <div>
              <label className="field-label">对应产品</label>
              <input value={form.product} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} />
            </div>
            <div>
              <label className="field-label">发布时间</label>
              <input
                type="datetime-local"
                value={form.publishAt}
                onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">脚本</label>
              <textarea
                className="min-h-28"
                value={form.script}
                onChange={(event) => setForm((current) => ({ ...current, script: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">数据回填</label>
              <textarea
                className="min-h-24"
                value={form.dataNote}
                onChange={(event) => setForm((current) => ({ ...current, dataNote: event.target.value }))}
                placeholder="收藏率、评论区反馈、是否转化"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void createPlan()}>
              新增排期
            </button>
            {message ? <span className="self-center text-sm muted-text">{message}</span> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="tiny-label">Planner View</div>
            <h3 className="mt-2 text-xl font-semibold">内容排期视图</h3>
          </div>
          <Badge>{groupedPlans.length} 条内容</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {groupedPlans.map((plan) => (
            <div key={plan.id} className="panel-soft p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="text-lg font-semibold">{plan.title}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{CONTENT_TYPE_LABELS[plan.contentType]}</Badge>
                    <Badge tone={contentStatusTone(plan.status)}>
                      {CONTENT_STATUS_LABELS[plan.status]}
                    </Badge>
                    <Badge>{plan.audience}</Badge>
                    <Badge>{plan.scenario}</Badge>
                    <Badge>{plan.publishAt ? formatDateTime(plan.publishAt) : "未排时间"}</Badge>
                  </div>
                  <div className="text-sm leading-6 muted-text">
                    <div>产品：{plan.product}</div>
                    <div className="mt-2">脚本：{plan.script}</div>
                    {plan.dataNote ? <div className="mt-2">数据回填：{plan.dataNote}</div> : null}
                  </div>
                </div>
                <div className="rounded-3xl bg-white px-4 py-3 text-sm muted-text">
                  计划发布时间
                  <div className="mt-2 text-base font-semibold text-foreground">
                    {plan.publishAt ? formatDateTime(plan.publishAt) : "待补"}
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
