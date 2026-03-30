"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { getAppDateKey } from "@/lib/app-time";
import { Badge } from "@/components/badge";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import {
  WEEKLY_ENGAGEMENT_ROLE_LABELS,
  WEEKLY_ENGAGEMENT_ROLE_OPTIONS,
  WEEKLY_ENGAGEMENT_STATUS_LABELS,
  WEEKLY_ENGAGEMENT_STATUS_OPTIONS,
  WEEKLY_ENGAGEMENT_TYPE_LABELS,
  WEEKLY_ENGAGEMENT_TYPE_OPTIONS,
} from "@/lib/options";
import type {
  WeeklyEngagementRecord,
  WeeklyEngagementRole,
  WeeklyEngagementStatus,
  WeeklyEngagementType,
} from "@/lib/types";
import { formatDateOnly, isThisWeekIso } from "@/lib/utils";

const initialForm = {
  title: "",
  type: "MEETING" as WeeklyEngagementType,
  date: getAppDateKey(),
  time: "",
  contactName: "",
  contactRole: "COLLEAGUE" as WeeklyEngagementRole,
  note: "",
  referenceLinksText: "",
  status: "PENDING" as WeeklyEngagementStatus,
  remark: "",
};

function formatSchedule(date: string, time?: string | null) {
  const day = formatDateOnly(date);
  return time ? `${day} ${time}` : day;
}

function parseLinks(value: string) {
  return value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WeeklyEngagementsClient({
  initialEngagements,
}: {
  initialEngagements: WeeklyEngagementRecord[];
}) {
  const [records, setRecords] = useState(initialEngagements);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | WeeklyEngagementType>("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | WeeklyEngagementRole>("ALL");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    return records.filter((item) => {
      if (!isThisWeekIso(item.date)) return false;
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (roleFilter !== "ALL" && item.contactRole !== roleFilter) return false;
      return true;
    });
  }, [records, typeFilter, roleFilter]);

  async function saveRecord() {
    if (!form.title.trim()) {
      setMessage("请先填写对接标题");
      return;
    }
    if (!form.contactName.trim()) {
      setMessage("请先填写对接人");
      return;
    }

    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time || null,
      contactName: form.contactName.trim(),
      contactRole: form.contactRole,
      note: form.note.trim() || null,
      referenceLinks: parseLinks(form.referenceLinksText),
      status: form.status,
      remark: form.remark.trim() || null,
    };

    if (editingId) {
      const updated = await fetchJson<WeeklyEngagementRecord>(`/api/weekly-engagements/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setRecords((current) => current.map((item) => (item.id === editingId ? updated : item)));
      setEditingId(null);
      setForm(initialForm);
      setMessage("对接记录已更新");
      return;
    }

    const created = await fetchJson<WeeklyEngagementRecord>("/api/weekly-engagements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setRecords((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("对接记录已新增");
  }

  function startEdit(item: WeeklyEngagementRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      type: item.type,
      date: item.date,
      time: item.time ?? "",
      contactName: item.contactName,
      contactRole: item.contactRole,
      note: item.note ?? "",
      referenceLinksText: item.referenceLinks.join("\n"),
      status: item.status,
      remark: item.remark ?? "",
    });
    setMessage(`正在编辑：${item.title}`);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("已取消编辑");
  }

  async function remove(item: WeeklyEngagementRecord) {
    if (!window.confirm(`确定删除“${item.title}”吗？`)) return;
    await fetchJson(`/api/weekly-engagements/${item.id}`, { method: "DELETE" });
    setRecords((current) => current.filter((record) => record.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setForm(initialForm);
    }
    setMessage("对接记录已删除");
  }

  async function updateStatus(id: string, status: WeeklyEngagementStatus) {
    const updated = await fetchJson<WeeklyEngagementRecord>(`/api/weekly-engagements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setRecords((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="tiny-label">This Week</div>
          <h3 className="mt-2 text-xl font-semibold">本周对接</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "ALL" | WeeklyEngagementType)}
            className="w-[140px]"
          >
            <option value="ALL">全部类型</option>
            {WEEKLY_ENGAGEMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | WeeklyEngagementRole)}
            className="w-[140px]"
          >
            <option value="ALL">全部对象</option>
            {WEEKLY_ENGAGEMENT_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Badge>{filtered.length} 条</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="field-label">标题</label>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="例如：和主播确认本周直播排期"
          />
        </div>
        <div>
          <label className="field-label">日期</label>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">时间</label>
          <input
            type="time"
            value={form.time}
            onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">对接人</label>
          <input
            value={form.contactName}
            onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
            placeholder="主播 / 摄影 / 品牌方"
          />
        </div>
        <div>
          <label className="field-label">对象角色</label>
          <select
            value={form.contactRole}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contactRole: event.target.value as WeeklyEngagementRole,
              }))
            }
          >
            {WEEKLY_ENGAGEMENT_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">类型</label>
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value as WeeklyEngagementType }))
            }
          >
            {WEEKLY_ENGAGEMENT_TYPE_OPTIONS.map((option) => (
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
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as WeeklyEngagementStatus,
              }))
            }
          >
            {WEEKLY_ENGAGEMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 xl:col-span-4">
          <label className="field-label">事项说明</label>
          <textarea
            className="min-h-20"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="记录对接事项、准备内容、需要确认的问题"
          />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">参考链接（可空）</label>
          <textarea
            className="min-h-20"
            value={form.referenceLinksText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                referenceLinksText: event.target.value,
              }))
            }
            placeholder="每行一个链接，例如：https://www.xiaohongshu.com/explore/..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">备注（可空）</label>
          <textarea
            className="min-h-20"
            value={form.remark}
            onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
            placeholder="例如：优先安排在上午拍摄"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="button-primary gap-2" onClick={() => void saveRecord()}>
          <Plus className="h-4 w-4" />
          {editingId ? "保存修改" : "新增对接"}
        </button>
        {editingId ? (
          <button type="button" className="button-secondary gap-2" onClick={cancelEdit}>
            取消编辑
          </button>
        ) : null}
        {message ? <span className="self-center text-sm muted-text">{message}</span> : null}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="panel-soft p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="text-base font-semibold">{item.title}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{formatSchedule(item.date, item.time)}</Badge>
                  <Badge>{item.contactName}</Badge>
                  <Badge>{WEEKLY_ENGAGEMENT_ROLE_LABELS[item.contactRole]}</Badge>
                  <Badge>{WEEKLY_ENGAGEMENT_TYPE_LABELS[item.type]}</Badge>
                  <Badge>{WEEKLY_ENGAGEMENT_STATUS_LABELS[item.status]}</Badge>
                </div>
                {item.note ? <div className="text-sm leading-6 muted-text">{item.note}</div> : null}
                {item.referenceLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="muted-text">参考链接：</span>
                    {item.referenceLinks.map((link, index) => (
                      <a
                        key={`${item.id}-link-${index}`}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--accent)] hover:underline"
                      >
                        {`链接 ${index + 1}`}
                      </a>
                    ))}
                  </div>
                ) : null}
                {item.remark ? <div className="text-xs muted-text">备注：{item.remark}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={item.status}
                  onChange={(event) => void updateStatus(item.id, event.target.value as WeeklyEngagementStatus)}
                >
                  {WEEKLY_ENGAGEMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="button-secondary gap-2" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                  编辑
                </button>
                <button type="button" className="button-secondary gap-2" onClick={() => void remove(item)}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
