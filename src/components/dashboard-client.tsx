"use client";

import {
  CheckCheck,
  ClipboardList,
  Copy,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { VoiceInput } from "@/components/voice-input";
import { getAppDateKey } from "@/lib/app-time";
import { fetchJson } from "@/lib/client-fetch";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  WORKSPACE_PROGRESS_LABELS,
  WORKSPACE_PROGRESS_OPTIONS,
  WEEKLY_ENGAGEMENT_ROLE_LABELS,
  WEEKLY_ENGAGEMENT_ROLE_OPTIONS,
  WEEKLY_ENGAGEMENT_STATUS_LABELS,
  WEEKLY_ENGAGEMENT_STATUS_OPTIONS,
  WEEKLY_ENGAGEMENT_TYPE_LABELS,
  WEEKLY_ENGAGEMENT_TYPE_OPTIONS,
} from "@/lib/options";
import { taskPriorityTone, taskStatusTone, workspaceTone } from "@/lib/presentation";
import type {
  DashboardSnapshot,
  TaskRecord,
  TaskSuggestion,
  TaskStatus,
  WeeklyEngagementRecord,
  WeeklyEngagementRole,
  WeeklyEngagementStatus,
  WeeklyEngagementType,
  WorkspaceDayRecord,
} from "@/lib/types";
import { formatDateOnly, formatDateTime, isThisWeekIso, relativeDateLabel } from "@/lib/utils";

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

const initialEngagementForm = {
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

function formatEngagementSchedule(date: string, time?: string | null) {
  const dayLabel = formatDateOnly(date);
  if (!time) return dayLabel;
  return dayLabel + " " + time;
}

function parseEngagementLinks(value: string) {
  return value
    .split(/[\n,锛孿s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DashboardClient({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const [focusTasks, setFocusTasks] = useState(initialSnapshot.focusTasks);
  const [todayTasks, setTodayTasks] = useState(initialSnapshot.todayTasks);
  const [workspaceDay, setWorkspaceDay] = useState(initialSnapshot.workspaceDay);
  const [latestReport] = useState(initialSnapshot.latestReport);
  const [weeklyEngagements, setWeeklyEngagements] = useState(
    initialSnapshot.weeklyEngagements,
  );
  const [captureText, setCaptureText] = useState("");
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [engagementForm, setEngagementForm] = useState(initialEngagementForm);
  const [editingEngagementId, setEditingEngagementId] = useState<string | null>(null);
  const [engagementTypeFilter, setEngagementTypeFilter] = useState<"ALL" | WeeklyEngagementType>("ALL");
  const [engagementRoleFilter, setEngagementRoleFilter] = useState<"ALL" | WeeklyEngagementRole>("ALL");
  const [engagementMessage, setEngagementMessage] = useState("");

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

  const filteredEngagements = useMemo(() => {
    return weeklyEngagements.filter((item) => {
      if (!isThisWeekIso(item.date)) return false;
      if (engagementTypeFilter !== "ALL" && item.type !== engagementTypeFilter) return false;
      if (engagementRoleFilter !== "ALL" && item.contactRole !== engagementRoleFilter) return false;
      return true;
    });
  }, [weeklyEngagements, engagementTypeFilter, engagementRoleFilter]);

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
    const updatedTask = await fetchJson<TaskRecord>("/api/tasks/" + taskId, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    syncTask(updatedTask);
  }

  async function saveEngagement() {
    if (!engagementForm.title.trim()) {
      setEngagementMessage("鐠囧嘲鍘涙繅顐㈠晸鐎佃甯撮弽鍥暯");
      return;
    }
    if (!engagementForm.contactName.trim()) {
      setEngagementMessage("鐠囧嘲鍘涙繅顐㈠晸鐎佃甯存禍?");
      return;
    }

    const payload = {
      title: engagementForm.title.trim(),
      type: engagementForm.type,
      date: engagementForm.date,
      time: engagementForm.time || null,
      contactName: engagementForm.contactName.trim(),
      contactRole: engagementForm.contactRole,
      note: engagementForm.note.trim() || null,
      referenceLinks: parseEngagementLinks(engagementForm.referenceLinksText),
      status: engagementForm.status,
      remark: engagementForm.remark.trim() || null,
    };

    if (editingEngagementId) {
      const updated = await fetchJson<WeeklyEngagementRecord>(
        "/api/weekly-engagements/" + editingEngagementId,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      setWeeklyEngagements((current) =>
        current.map((item) => (item.id === editingEngagementId ? updated : item)),
      );
      setEditingEngagementId(null);
      setEngagementForm(initialEngagementForm);
      setEngagementMessage("鐎佃甯寸拋鏉跨秿瀹稿弶娲块弬鑸偓?");
      return;
    }

    const created = await fetchJson<WeeklyEngagementRecord>("/api/weekly-engagements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setWeeklyEngagements((current) => [created, ...current]);
    setEngagementForm(initialEngagementForm);
    setEngagementMessage("鐎佃甯寸拋鏉跨秿瀹告彃鍨卞鎭掆偓?");
  }

  function startEditEngagement(item: WeeklyEngagementRecord) {
    setEditingEngagementId(item.id);
    setEngagementForm({
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
    setEngagementMessage("正在编辑：" + item.title);
  }

  function cancelEditEngagement() {
    setEditingEngagementId(null);
    setEngagementForm(initialEngagementForm);
    setEngagementMessage("瀹告彃褰囧☉鍫㈢椽鏉堟垯鈧?");
  }

  async function removeEngagement(item: WeeklyEngagementRecord) {
    if (!window.confirm("确定删除“" + item.title + "”吗？")) return;
    await fetchJson("/api/weekly-engagements/" + item.id, { method: "DELETE" });
    setWeeklyEngagements((current) => current.filter((record) => record.id !== item.id));
    if (editingEngagementId === item.id) {
      setEditingEngagementId(null);
      setEngagementForm(initialEngagementForm);
    }
    setEngagementMessage("鐎佃甯寸拋鏉跨秿瀹告彃鍨归梽銈冣偓?");
  }

  async function updateEngagementStatus(id: string, status: WeeklyEngagementStatus) {
    const updated = await fetchJson<WeeklyEngagementRecord>("/api/weekly-engagements/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setWeeklyEngagements((current) => current.map((item) => (item.id === id ? updated : item)));
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
      setMessage("已拆出 " + response.suggestions.length + " 条任务建议。");
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
      setMessage(error instanceof Error ? error.message : "淇濆瓨澶辫触");
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
        description="把今天最关键的事收在一个页面里：看重点、改状态、收临时任务、记复盘。"
        action={<Badge tone="accent">{workspaceDay.dateKey}</Badge>}
      />

      <div className="grid-panels md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="浠婃棩浠诲姟" value={counts.total} />
        <StatCard label="已完成" value={counts.completed} />
        <StatCard label="绛夊緟浠栦汉" value={counts.waiting} />
        <StatCard label="閫炬湡鎻愰啋" value={counts.overdue} />
      </div>

      <div className="grid-panels xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Top 3 Focus</div>
              <h3 className="mt-2 text-xl font-semibold">浠婃棩涓変欢鏈€閲嶈鐨勪簨</h3>
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
                    <div className="text-xs muted-text">閲嶇偣 {index + 1}</div>
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
              <h3 className="mt-2 text-xl font-semibold">临时任务收集</h3>
            </div>
            <VoiceInput
              onTranscript={(text) =>
                setCaptureText((current) => (current ? current + "\n" + text : text))
              }
            />
          </div>

          <textarea
            className="mt-4 min-h-32"
            placeholder="渚嬪锛氭槑澶╀笅鍗?3 鐐瑰拰涓绘挱瀵规惌閰嶏紝鏃╀笂鍏堝璐э紝鍐嶅嚭鐩存挱棰勫憡鑴氭湰"
            value={captureText}
            onChange={(event) => setCaptureText(event.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={() => void handleSuggestTasks()}>
              <Sparkles className="h-4 w-4" />
              鑷姩鎷嗕换鍔?            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setCaptureText("");
                setSuggestions([]);
              }}
            >
              娓呯┖
            </button>
          </div>

          {suggestions.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">浠诲姟寤鸿</div>
                <button type="button" className="button-secondary" onClick={() => void createAllSuggestions()}>
                  一键加入全部
                </button>
              </div>
              {suggestions.map((suggestion) => (
                <div key={suggestion.title + "-" + (suggestion.dueAt || "none")} className="panel-soft p-4">
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
                      鍔犲叆浠诲姟
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>
      </div>


      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="tiny-label">This Week</div>
            <h3 className="mt-2 text-xl font-semibold">鏈懆瀵规帴</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={engagementTypeFilter}
              onChange={(event) => setEngagementTypeFilter(event.target.value as "ALL" | WeeklyEngagementType)}
              className="w-[140px]"
            >
              <option value="ALL">鍏ㄩ儴绫诲瀷</option>
              {WEEKLY_ENGAGEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={engagementRoleFilter}
              onChange={(event) => setEngagementRoleFilter(event.target.value as "ALL" | WeeklyEngagementRole)}
              className="w-[140px]"
            >
              <option value="ALL">鍏ㄩ儴瀵规帴浜?</option>
              {WEEKLY_ENGAGEMENT_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Badge>{filteredEngagements.length} 条</Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="field-label">瀵规帴鏍囬</label>
            <input
              value={engagementForm.title}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="渚嬪锛氬拰涓绘挱纭鏈懆鐩存挱鎺掓湡"
            />
          </div>
          <div>
            <label className="field-label">鏃ユ湡</label>
            <input
              type="date"
              value={engagementForm.date}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, date: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">鏃堕棿</label>
            <input
              type="time"
              value={engagementForm.time}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, time: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">瀵规帴浜?</label>
            <input
              value={engagementForm.contactName}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, contactName: event.target.value }))
              }
              placeholder="涓绘挱 / 鎽勫奖 / 鍝佺墝鏂?"
            />
          </div>
          <div>
            <label className="field-label">瀵规帴瀵硅薄</label>
            <select
              value={engagementForm.contactRole}
              onChange={(event) =>
                setEngagementForm((current) => ({
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
            <label className="field-label">瀵规帴绫诲瀷</label>
            <select
              value={engagementForm.type}
              onChange={(event) =>
                setEngagementForm((current) => ({
                  ...current,
                  type: event.target.value as WeeklyEngagementType,
                }))
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
              value={engagementForm.status}
              onChange={(event) =>
                setEngagementForm((current) => ({
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
            <label className="field-label">瀵规帴浜嬮」</label>
            <textarea
              className="min-h-20"
              value={engagementForm.note}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="鎻忚堪瑕佽皥鐨勫唴瀹广€佹敮鎸佽鍑烘憚褰便€佸叧閿粏鑺傜瓑"
            />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">鍙傝€冮摼鎺? (鍙€?)</label>
            <textarea
              className="min-h-20"
              value={engagementForm.referenceLinksText}
              onChange={(event) =>
                setEngagementForm((current) => ({
                  ...current,
                  referenceLinksText: event.target.value,
                }))
              }
              placeholder="姣忚涓€涓摼鎺ワ紝渚嬪：https://www.xiaohongshu.com/explore/..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">澶囨敞 (鍙€?)</label>
            <textarea
              className="min-h-20"
              value={engagementForm.remark}
              onChange={(event) =>
                setEngagementForm((current) => ({ ...current, remark: event.target.value }))
              }
              placeholder="渚嬪锛氬叾瀹炴棩绋嬫渶濂芥槸涓婂崍"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="button-primary gap-2" onClick={() => void saveEngagement()}>
            <Plus className="h-4 w-4" />
            {editingEngagementId ? "保存修改" : "新增对接"}
          </button>
          {editingEngagementId ? (
            <button type="button" className="button-secondary gap-2" onClick={cancelEditEngagement}>
              鍙栨秷缂栬緫
            </button>
          ) : null}
          {engagementMessage ? <span className="self-center text-sm muted-text">{engagementMessage}</span> : null}
        </div>

        <div className="mt-4 space-y-3">
          {filteredEngagements.map((item) => (
            <div key={item.id} className="panel-soft p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="text-base font-semibold">{item.title}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{formatEngagementSchedule(item.date, item.time)}</Badge>
                    <Badge>{item.contactName}</Badge>
                    <Badge>{WEEKLY_ENGAGEMENT_ROLE_LABELS[item.contactRole]}</Badge>
                    <Badge>{WEEKLY_ENGAGEMENT_TYPE_LABELS[item.type]}</Badge>
                    <Badge>{WEEKLY_ENGAGEMENT_STATUS_LABELS[item.status]}</Badge>
                  </div>
                  {item.note ? <div className="text-sm leading-6 muted-text">{item.note}</div> : null}
                  {item.referenceLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="muted-text">鍙傝€冮摼鎺? /</span>
                      {item.referenceLinks.map((link, index) => (
                        <a
                          key={item.id + "-link-" + index}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[color:var(--accent)] hover:underline"
                        >
                          {"链接 " + (index + 1)}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {item.remark ? <div className="text-xs muted-text">备注：{item.remark}</div> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={item.status}
                    onChange={(event) =>
                      void updateEngagementStatus(item.id, event.target.value as WeeklyEngagementStatus)
                    }
                  >
                    {WEEKLY_ENGAGEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="button-secondary gap-2" onClick={() => startEditEngagement(item)}>
                    <Pencil className="h-4 w-4" />
                    缂栬緫
                  </button>
                  <button type="button" className="button-secondary gap-2" onClick={() => void removeEngagement(item)}>
                    <Trash2 className="h-4 w-4" />
                    鍒犻櫎
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <div className="grid-panels xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-xl font-semibold">浠婃棩浠诲姟鍒楄〃</h3>
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
              <h3 className="mt-2 text-xl font-semibold">浠婃棩杩涘害鐘舵€佷笌涓嬬彮澶嶇洏</h3>
            </div>
            <button type="button" className="button-primary gap-2" onClick={() => void saveWorkspace()}>
              <Save className="h-4 w-4" />
              淇濆瓨
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
              <label className="field-label">今日最核心的推进方向</label>
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
              <label className="field-label">鏄庢棩璁″垝</label>
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
                    澶嶅埗
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
          <span>{isSubmitting ? "澶勭悊涓?.." : message}</span>
        </div>
      ) : null}
    </div>
  );
}
