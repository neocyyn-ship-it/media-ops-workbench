"use client";

import { CheckCheck, ClipboardList, Copy, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { VoiceInput } from "@/components/voice-input";
import { WeeklyEngagementsClient } from "@/components/weekly-engagements-client";
import { fetchJson } from "@/lib/client-fetch";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  WORKSPACE_PROGRESS_LABELS,
  WORKSPACE_PROGRESS_OPTIONS,
} from "@/lib/options";
import { taskPriorityTone, taskStatusTone, workspaceTone } from "@/lib/presentation";
import type {
  DashboardSnapshot,
  TaskRecord,
  TaskSuggestion,
  TaskStatus,
  WorkspaceDayRecord,
} from "@/lib/types";
import { formatDateTime, relativeDateLabel } from "@/lib/utils";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="panel-soft p-4">
      <div className="text-xs muted-text">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function DashboardClient({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const [focusTasks, setFocusTasks] = useState(initialSnapshot.focusTasks);
  const [todayTasks, setTodayTasks] = useState(initialSnapshot.todayTasks);
  const [workspaceDay, setWorkspaceDay] = useState(initialSnapshot.workspaceDay);
  const [latestReport] = useState(initialSnapshot.latestReport);
  const [captureText, setCaptureText] = useState("");
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const counts = useMemo(
    () => ({
      total: todayTasks.length,
      completed: todayTasks.filter((task) => task.status === "DONE").length,
      waiting: todayTasks.filter((task) => task.status === "WAITING").length,
      overdue: todayTasks.filter((task) => task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "DONE")
        .length,
    }),
    [todayTasks],
  );

  function syncTask(updatedTask: TaskRecord) {
    setTodayTasks((current) =>
      current.some((task) => task.id === updatedTask.id)
        ? current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        : [updatedTask, ...current],
    );
    setFocusTasks((current) =>
      current.some((task) => task.id === updatedTask.id)
        ? current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        : updatedTask.isTodayFocus
          ? [updatedTask, ...current].slice(0, 3)
          : current,
    );
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const updatedTask = await fetchJson<TaskRecord>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    syncTask(updatedTask);
  }

  async function handleSuggestTasks() {
    if (!captureText.trim()) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetchJson<{ suggestions: TaskSuggestion[] }>("/api/assist/tasks", {
        method: "POST",
        body: JSON.stringify({ input: captureText }),
      });
      setSuggestions(response.suggestions);
      setMessage(`已拆出 ${response.suggestions.length} 条任务建议。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "拆解失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createSuggestedTask(suggestion: TaskSuggestion) {
    const created = await fetchJson<TaskRecord>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...suggestion,
        cadence: "ONE_OFF",
        owner: suggestion.owner ?? "",
      }),
    });
    syncTask(created);
    setSuggestions((current) => current.filter((item) => item.title !== suggestion.title));
    setMessage("任务已加入列表。");
  }

  async function createAllSuggestions() {
    for (const suggestion of suggestions) {
      await createSuggestedTask(suggestion);
    }
    setSuggestions([]);
    setCaptureText("");
  }

  async function saveWorkspace() {
    setIsSubmitting(true);
    setMessage("");
    try {
      const nextDay = await fetchJson<WorkspaceDayRecord>("/api/dashboard/day", {
        method: "PATCH",
        body: JSON.stringify({
          dateKey: workspaceDay.dateKey,
          progressStatus: workspaceDay.progressStatus,
          morningFocus: workspaceDay.morningFocus,
          reviewText: workspaceDay.reviewText,
          tomorrowPlan: workspaceDay.tomorrowPlan,
        }),
      });
      setWorkspaceDay(nextDay);
      setMessage("今日进度和复盘已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyDailyReport() {
    if (!latestReport) return;
    await navigator.clipboard.writeText(latestReport.dailyReport);
    setMessage("最近一次日报已复制。");
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="今日工作台"
        description="把今天最关键的事收拢到一个页面里：看重点、改状态、收临时任务、记复盘。"
        action={<Badge tone="accent">{workspaceDay.dateKey}</Badge>}
      />

      <div className="grid-panels md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="今日任务" value={counts.total} />
        <StatCard label="已完成" value={counts.completed} />
        <StatCard label="等待他人" value={counts.waiting} />
        <StatCard label="逾期提醒" value={counts.overdue} />
      </div>

      <div className="grid-panels xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Top 3 Focus</div>
              <h3 className="mt-2 text-xl font-semibold">今日三件最重要的事</h3>
            </div>
            <Badge tone={workspaceTone(workspaceDay.progressStatus)}>
              {WORKSPACE_PROGRESS_LABELS[workspaceDay.progressStatus]}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {focusTasks.map((task, index) => (
              <div key={task.id} className="panel-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs muted-text">重点 {index + 1}</div>
                    <div className="mt-2 text-base font-semibold">{task.title}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={taskPriorityTone(task.priority)}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <Badge tone={taskStatusTone(task.status)}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <Badge>{relativeDateLabel(task.dueAt)}</Badge>
                    </div>
                  </div>
                  <select
                    value={task.status}
                    onChange={(event) => void updateTaskStatus(task.id, event.target.value as TaskStatus)}
                    className="w-[132px]"
                  >
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {task.notes ? <p className="mt-3 text-sm leading-6 muted-text">{task.notes}</p> : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Quick Capture</div>
              <h3 className="mt-2 text-xl font-semibold">临时任务收集框</h3>
            </div>
            <VoiceInput onTranscript={(text) => setCaptureText((current) => `${current}${current ? "\n" : ""}${text}`)} />
          </div>

          <textarea
            className="mt-4 min-h-32"
            placeholder="例如：明天下午 3 点和主播对搭配，早上先对货，再出直播预告脚本"
            value={captureText}
            onChange={(event) => setCaptureText(event.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={() => void handleSuggestTasks()}>
              <Sparkles className="h-4 w-4" />
              自动拆任务
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setCaptureText("");
                setSuggestions([]);
              }}
            >
              清空
            </button>
          </div>

          {suggestions.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">任务建议</div>
                <button type="button" className="button-secondary" onClick={() => void createAllSuggestions()}>
                  一键加入全部
                </button>
              </div>
              {suggestions.map((suggestion) => (
                <div key={`${suggestion.title}-${suggestion.dueAt ?? "none"}`} className="panel-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={taskPriorityTone(suggestion.priority)}>
                          {TASK_PRIORITY_LABELS[suggestion.priority]}
                        </Badge>
                        <Badge>{suggestion.dueAt ? formatDateTime(suggestion.dueAt) : "未识别时间"}</Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void createSuggestedTask(suggestion)}
                    >
                      加入任务
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <WeeklyEngagementsClient initialEngagements={initialSnapshot.weeklyEngagements} />

      <div className="grid-panels xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-xl font-semibold">今日任务列表</h3>
          </div>

          <div className="mt-4 space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="panel-soft p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-medium">{task.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={taskPriorityTone(task.priority)}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <Badge tone={taskStatusTone(task.status)}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <Badge>{task.owner || "待分配"}</Badge>
                      <Badge>{relativeDateLabel(task.dueAt)}</Badge>
                    </div>
                  </div>

                  <select
                    value={task.status}
                    onChange={(event) => void updateTaskStatus(task.id, event.target.value as TaskStatus)}
                    className="w-full lg:w-[150px]"
                  >
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Daily Review</div>
              <h3 className="mt-2 text-xl font-semibold">今日进度状态与下班复盘</h3>
            </div>
            <button type="button" className="button-primary gap-2" onClick={() => void saveWorkspace()}>
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label">今日进度状态</label>
              <select
                value={workspaceDay.progressStatus}
                onChange={(event) =>
                  setWorkspaceDay((current) => ({
                    ...current,
                    progressStatus: event.target.value as WorkspaceDayRecord["progressStatus"],
                  }))
                }
              >
                {WORKSPACE_PROGRESS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">今天最核心的推进方向</label>
              <textarea
                className="min-h-24"
                value={workspaceDay.morningFocus ?? ""}
                onChange={(event) =>
                  setWorkspaceDay((current) => ({
                    ...current,
                    morningFocus: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="field-label">下班前复盘</label>
              <textarea
                className="min-h-28"
                value={workspaceDay.reviewText ?? ""}
                onChange={(event) =>
                  setWorkspaceDay((current) => ({
                    ...current,
                    reviewText: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="field-label">明日计划</label>
              <textarea
                className="min-h-24"
                value={workspaceDay.tomorrowPlan ?? ""}
                onChange={(event) =>
                  setWorkspaceDay((current) => ({
                    ...current,
                    tomorrowPlan: event.target.value,
                  }))
                }
              />
            </div>

            {latestReport ? (
              <div className="panel-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">最近一次日报草稿</div>
                  <button type="button" className="button-secondary gap-2" onClick={() => void copyDailyReport()}>
                    <Copy className="h-4 w-4" />
                    复制
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 muted-text">{latestReport.dailyReport}</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-full border bg-white/90 px-4 py-3 text-sm">
          <CheckCheck className="h-4 w-4 text-[color:var(--accent)]" />
          <span>{isSubmitting ? "处理中..." : message}</span>
        </div>
      ) : null}
    </div>
  );
}
