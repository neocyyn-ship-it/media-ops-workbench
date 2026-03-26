"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import { PLATFORM_LABELS, PLATFORM_OPTIONS } from "@/lib/options";
import type { CompetitorRecord, Platform } from "@/lib/types";
import { formatDateOnly } from "@/lib/utils";

const initialForm = {
  accountName: "",
  platform: "XIAOHONGSHU" as Platform,
  contentLink: "",
  contentTopic: "",
  hookPoint: "",
  commentInsight: "",
  takeaway: "",
};

export function CompetitorTrackerClient({
  initialItems,
}: {
  initialItems: CompetitorRecord[];
}) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function saveItem() {
    if (!form.accountName.trim() || !form.contentTopic.trim()) {
      setMessage("请至少填写账号名和内容主题。");
      return;
    }

    if (editingId) {
      const updated = await fetchJson<CompetitorRecord>(`/api/competitors/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setItems((current) => current.map((item) => (item.id === editingId ? updated : item)));
      setEditingId(null);
      setForm(initialForm);
      setMessage("竞品观察已更新。");
      return;
    }

    const created = await fetchJson<CompetitorRecord>("/api/competitors", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setItems((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("竞品观察已保存。");
  }

  function startEditing(item: CompetitorRecord) {
    setEditingId(item.id);
    setForm({
      accountName: item.accountName,
      platform: item.platform,
      contentLink: item.contentLink ?? "",
      contentTopic: item.contentTopic,
      hookPoint: item.hookPoint,
      commentInsight: item.commentInsight,
      takeaway: item.takeaway,
    });
    setMessage(`正在编辑「${item.contentTopic}」`);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("已取消编辑。");
  }

  async function removeItem(item: CompetitorRecord) {
    if (!window.confirm(`确定删除这条竞品观察吗？\n\n${item.contentTopic}`)) return;

    await fetchJson(`/api/competitors/${item.id}`, {
      method: "DELETE",
    });
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setForm(initialForm);
    }
    setMessage("竞品观察已删除。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="竞品观察"
        description="记录同行账号的内容主题、爆点、评论区洞察和对我们的启发，也能随时回头修改。"
        action={<Badge>{items.length} 条观察</Badge>}
      />

      <div className="grid-panels xl:grid-cols-[0.88fr_1.12fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">{editingId ? "编辑竞品观察" : "新增竞品观察"}</h3>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">账号名</label>
              <input
                value={form.accountName}
                onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">平台</label>
              <select
                value={form.platform}
                onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as Platform }))}
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">内容链接</label>
              <input
                value={form.contentLink}
                onChange={(event) => setForm((current) => ({ ...current, contentLink: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">内容主题</label>
              <input
                value={form.contentTopic}
                onChange={(event) => setForm((current) => ({ ...current, contentTopic: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">爆点</label>
              <textarea
                className="min-h-24"
                value={form.hookPoint}
                onChange={(event) => setForm((current) => ({ ...current, hookPoint: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">评论区洞察</label>
              <textarea
                className="min-h-24"
                value={form.commentInsight}
                onChange={(event) =>
                  setForm((current) => ({ ...current, commentInsight: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label">对我有什么启发</label>
              <textarea
                className="min-h-24"
                value={form.takeaway}
                onChange={(event) => setForm((current) => ({ ...current, takeaway: event.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void saveItem()}>
              {editingId ? "保存修改" : "保存观察"}
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
          <div className="tiny-label">Tracker</div>
          <h3 className="mt-2 text-xl font-semibold">竞品观察列表</h3>

          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="panel-soft p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{item.accountName}</Badge>
                      <Badge>{PLATFORM_LABELS[item.platform]}</Badge>
                      <Badge>{formatDateOnly(item.observedAt)}</Badge>
                    </div>
                    <div className="text-lg font-semibold">{item.contentTopic}</div>
                    <div className="text-sm leading-6 muted-text">
                      <div>爆点：{item.hookPoint}</div>
                      <div className="mt-2">评论区洞察：{item.commentInsight}</div>
                      <div className="mt-2">启发：{item.takeaway}</div>
                    </div>
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
                  <div className="rounded-3xl bg-white px-4 py-3 text-sm muted-text xl:max-w-[260px]">
                    <div>内容链接</div>
                    <div className="mt-2 break-all text-foreground">{item.contentLink || "未填写"}</div>
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
