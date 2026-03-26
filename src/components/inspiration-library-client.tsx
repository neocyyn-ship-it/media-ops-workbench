"use client";

import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import { INSPIRATION_TYPE_LABELS, INSPIRATION_TYPE_OPTIONS } from "@/lib/options";
import { inspirationTone } from "@/lib/presentation";
import type { InspirationRecord, InspirationType } from "@/lib/types";
import { formatDateOnly, textToTags } from "@/lib/utils";

const initialForm = {
  link: "",
  screenshot: "",
  sourceAccount: "",
  type: "TITLE" as InspirationType,
  hookSummary: "",
  reusableIdea: "",
  tags: "",
};

export function InspirationLibraryClient({ initialItems }: { initialItems: InspirationRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("全部");
  const [message, setMessage] = useState("");

  const tags = useMemo(() => {
    return ["全部", ...new Set(items.flatMap((item) => textToTags(item.tags)))];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const haystack = [
        item.sourceAccount,
        item.hookSummary,
        item.reusableIdea,
        item.tags,
        item.link ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesTag = activeTag === "全部" || textToTags(item.tags).includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [activeTag, items, search]);

  async function saveItem() {
    if (!form.sourceAccount.trim() || !form.hookSummary.trim()) {
      setMessage("请至少填写来源账号和爆点总结。");
      return;
    }

    if (editingId) {
      const updated = await fetchJson<InspirationRecord>(`/api/inspiration/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setItems((current) => current.map((item) => (item.id === editingId ? updated : item)));
      setEditingId(null);
      setForm(initialForm);
      setMessage("素材已更新。");
      return;
    }

    const created = await fetchJson<InspirationRecord>("/api/inspiration", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setItems((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("素材已加入灵感库。");
  }

  function startEditing(item: InspirationRecord) {
    setEditingId(item.id);
    setForm({
      link: item.link ?? "",
      screenshot: item.screenshot ?? "",
      sourceAccount: item.sourceAccount,
      type: item.type,
      hookSummary: item.hookSummary,
      reusableIdea: item.reusableIdea,
      tags: item.tags,
    });
    setMessage(`正在编辑「${item.hookSummary}」`);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("已取消编辑。");
  }

  async function removeItem(item: InspirationRecord) {
    if (!window.confirm(`确定删除这条素材吗？\n\n${item.hookSummary}`)) return;

    await fetchJson(`/api/inspiration/${item.id}`, {
      method: "DELETE",
    });
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setForm(initialForm);
    }
    setMessage("素材已删除。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="爆款素材库"
        description="沉淀封面、标题、文案、视频结构和评论区洞察，支持搜索、标签筛选和直接编辑。"
        action={<Badge>{items.length} 条素材</Badge>}
      />

      <div className="grid-panels xl:grid-cols-[0.88fr_1.12fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">{editingId ? "编辑素材" : "新增素材"}</h3>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">链接 / 截图占位</label>
              <input
                value={form.link}
                onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
                placeholder="可填小红书链接"
              />
            </div>
            <div>
              <label className="field-label">来源账号</label>
              <input
                value={form.sourceAccount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceAccount: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label">类型</label>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as InspirationType }))}
              >
                {INSPIRATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">爆点总结</label>
              <textarea
                className="min-h-24"
                value={form.hookSummary}
                onChange={(event) => setForm((current) => ({ ...current, hookSummary: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">可复用点</label>
              <textarea
                className="min-h-24"
                value={form.reusableIdea}
                onChange={(event) => setForm((current) => ({ ...current, reusableIdea: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">标签</label>
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="面试穿搭 标题 情绪价值"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void saveItem()}>
              {editingId ? "保存修改" : "加入素材库"}
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <h3 className="text-xl font-semibold">搜索与标签筛选</h3>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜来源账号、爆点、标签"
            />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={tag === activeTag ? "button-primary" : "button-secondary"}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="panel-soft p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={inspirationTone(item.type)}>{INSPIRATION_TYPE_LABELS[item.type]}</Badge>
                      <Badge>{item.sourceAccount}</Badge>
                      <Badge>{formatDateOnly(item.capturedAt)}</Badge>
                    </div>
                    <div className="text-base font-semibold">{item.hookSummary}</div>
                    <div className="text-sm leading-6 muted-text">{item.reusableIdea}</div>
                    <div className="flex flex-wrap gap-2">
                      {textToTags(item.tags).map((tag) => (
                        <Badge key={`${item.id}-${tag}`}>{tag}</Badge>
                      ))}
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
                  <div className="rounded-3xl bg-white px-4 py-3 text-sm muted-text xl:max-w-[280px]">
                    <div>链接 / 截图</div>
                    <div className="mt-2 break-all text-foreground">{item.link || item.screenshot || "占位"}</div>
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
