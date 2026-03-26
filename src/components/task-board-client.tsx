"use client";

import { Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fetchJson } from "@/lib/client-fetch";
import {
  TASK_CADENCE_LABELS,
  TASK_CADENCE_OPTIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_LABELS,
  TASK_TYPE_OPTIONS,
} from "@/lib/options";
import { taskPriorityTone, taskStatusTone } from "@/lib/presentation";
import type {
  TaskCadence,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  TaskType,
  TaskView,
} from "@/lib/types";
import {
  formatDateTime,
  isThisWeekIso,
  isTodayIso,
  relativeDateLabel,
  toDatetimeLocalValue,
} from "@/lib/utils";

const initialForm = {
  title: "",
  type: "CONTENT" as TaskType,
  priority: "MEDIUM" as TaskPriority,
  dueAt: "",
  owner: "",
  status: "NOT_STARTED" as TaskStatus,
  notes: "",
  cadence: "ONE_OFF" as TaskCadence,
};

export function TaskBoardClient({ initialTasks }: { initialTasks: TaskRecord[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<TaskView>("today");
  const [form, setForm] = useState(initialForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filteredTasks = useMemo(() => {
    if (view === "today") {
      return tasks.filter((task) => task.isTodayFocus || isTodayIso(task.dueAt));
    }
    if (view === "week") {
      return tasks.filter((task) => task.isTodayFocus || isThisWeekIso(task.dueAt));
    }
    return tasks;
  }, [tasks, view]);

  async function saveTask() {
    if (!form.title.trim()) {
      setMessage("请先填写任务名称。");
      return;
    }

    const payload = {
      ...form,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    };

    if (editingTaskId) {
      const updated = await fetchJson<TaskRecord>(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setTasks((current) => current.map((task) => (task.id === editingTaskId ? updated : task)));
      setEditingTaskId(null);
      setForm(initialForm);
      setMessage("任务已更新。");
      return;
    }

    const created = await fetchJson<TaskRecord>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setTasks((current) => [created, ...current]);
    setForm(initialForm);
    setMessage("任务已创建。");
  }

  async function updateTask(taskId: string, patch: Partial<TaskRecord>) {
    const updated = await fetchJson<TaskRecord>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
  }

  function startEditing(task: TaskRecord) {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      type: task.type,
      priority: task.priority,
      dueAt: toDatetimeLocalValue(task.dueAt),
      owner: task.owner ?? "",
      status: task.status,
      notes: task.notes ?? "",
      cadence: task.cadence,
    });
    setMessage(`正在编辑「${task.title}」`);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setForm(initialForm);
    setMessage("已取消编辑。");
  }

  async function removeTask(task: TaskRecord) {
    if (!window.confirm(`确定删除任务「${task.title}」吗？`)) return;

    await fetchJson(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });
    setTasks((current) => current.filter((item) => item.id !== task.id));

    if (editingTaskId === task.id) {
      setEditingTaskId(null);
      setForm(initialForm);
    }

    setMessage("任务已删除。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="任务管理"
        description="管理固定任务和临时任务，支持按今天、本周和全部查看，也能直接编辑已有任务。"
        action={
          <div className="flex gap-2">
            {(["today", "week", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={item === view ? "button-primary" : "button-secondary"}
                onClick={() => setView(item)}
              >
                {item === "today" ? "今天" : item === "week" ? "本周" : "全部"}
              </button>
            ))}
          </div>
        }
      />

      <SectionCard>
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          <h3 className="text-xl font-semibold">{editingTaskId ? "编辑任务" : "快速新增任务"}</h3>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="field-label">任务名称</label>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="例如：跟主播确认面试穿搭直播口播"
            />
          </div>
          <div>
            <label className="field-label">任务类型</label>
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TaskType }))}
            >
              {TASK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">优先级</label>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))
              }
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">截止时间</label>
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">相关人</label>
            <input
              value={form.owner}
              onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
              placeholder="主播 / 摄影 / 自己"
            />
          </div>
          <div>
            <label className="field-label">状态</label>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}
            >
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">固定/临时</label>
            <select
              value={form.cadence}
              onChange={(event) => setForm((current) => ({ ...current, cadence: event.target.value as TaskCadence }))}
            >
              {TASK_CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <label className="field-label">备注</label>
            <textarea
              className="min-h-24"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="补充任务背景、对接要求和注意事项"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="button-primary gap-2" onClick={() => void saveTask()}>
            <Plus className="h-4 w-4" />
            {editingTaskId ? "保存修改" : "新增任务"}
          </button>
          {editingTaskId ? (
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
            <div className="tiny-label">Task List</div>
            <h3 className="mt-2 text-xl font-semibold">
              {view === "today" ? "今天" : view === "week" ? "本周" : "全部"}任务
            </h3>
          </div>
          <Badge>{filteredTasks.length} 条</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="panel-soft p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{task.title}</div>
                    {task.isTodayFocus ? (
                      <Badge tone="accent" className="gap-1">
                        <Pin className="h-3.5 w-3.5" />
                        今日重点
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge>{TASK_TYPE_LABELS[task.type]}</Badge>
                    <Badge tone={taskPriorityTone(task.priority)}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
                    <Badge tone={taskStatusTone(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
                    <Badge>{TASK_CADENCE_LABELS[task.cadence]}</Badge>
                    <Badge>{task.owner || "未指定相关人"}</Badge>
                    <Badge>{relativeDateLabel(task.dueAt)}</Badge>
                  </div>

                  <div className="text-sm leading-6 muted-text">
                    {task.notes || "暂无备注。"}
                    <div className="mt-2">创建时间：{formatDateTime(task.createdAt)}</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:w-[320px] xl:grid-cols-1">
                  <select
                    value={task.status}
                    onChange={(event) => void updateTask(task.id, { status: event.target.value as TaskStatus })}
                  >
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={task.isTodayFocus ? "button-primary" : "button-secondary"}
                    onClick={() => void updateTask(task.id, { isTodayFocus: !task.isTodayFocus })}
                  >
                    {task.isTodayFocus ? "取消今日重点" : "设为今日重点"}
                  </button>
                  <button type="button" className="button-secondary gap-2" onClick={() => startEditing(task)}>
                    <Pencil className="h-4 w-4" />
                    编辑
                  </button>
                  <button type="button" className="button-secondary gap-2" onClick={() => void removeTask(task)}>
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
