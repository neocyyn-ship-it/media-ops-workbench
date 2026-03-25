"use client";

import { Pin, Plus } from "lucide-react";
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
import type { TaskCadence, TaskPriority, TaskRecord, TaskStatus, TaskType, TaskView } from "@/lib/types";
import {
  formatDateTime,
  isThisWeekIso,
  isTodayIso,
  relativeDateLabel,
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

  async function createTask() {
    if (!form.title.trim()) {
      setMessage("请先填写任务名称。");
      return;
    }

    const created = await fetchJson<TaskRecord>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      }),
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

  return (
    <div className="space-y-5">
      <PageHeading
        title="任务管理"
        description="管理固定任务和临时任务，支持快速新增、切换状态、按今天和本周查看。"
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
          <h3 className="text-xl font-semibold">快速新增任务</h3>
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
              placeholder="主播小七 / 摄影 / 自己"
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
              placeholder="补充任务背景、对接要求、注意事项"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="button-primary gap-2" onClick={() => void createTask()}>
            <Plus className="h-4 w-4" />
            新增任务
          </button>
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
                    <Badge tone={taskPriorityTone(task.priority)}>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge tone={taskStatusTone(task.status)}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
