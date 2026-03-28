"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  getHours,
  getMinutes,
  isSameDay,
  isSameMonth,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import {
  buildCalendarLegend,
  buildHolidayWarmupMap,
  formatPlannerHeader,
  formatPlannerPeriod,
  getCalendarLabelMeta,
  getCalendarLabelName,
  getHolidayMarker,
  getStatusSubtitle,
  getWarmupMarker,
  isWeekend,
  resolveCalendarLabel,
  WEEKDAY_LABELS,
  WORK_SCHEDULE_TEXT,
  type WarmupMarker,
} from "@/lib/calendar";
import { getAppToday } from "@/lib/app-time";
import { fetchJson } from "@/lib/client-fetch";
import { cn, formatDateTime, toDateKey, toDatetimeLocalValue } from "@/lib/utils";
import {
  CALENDAR_LABEL_OPTIONS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_OPTIONS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_OPTIONS,
  CONTENT_WORKFLOW_STAGE_LABELS,
  CONTENT_WORKFLOW_STAGE_OPTIONS,
} from "@/lib/options";
import { workflowStageTone } from "@/lib/presentation";
import type {
  CalendarLabel,
  ContentPlanRecord,
  ContentStatus,
  ContentSuggestion,
  ContentType,
  ContentWorkflowStage,
  HolidayMarker,
  PlannerView,
} from "@/lib/types";

const initialForm = {
  title: "",
  contentType: "LIVE_TRAILER" as ContentType,
  audience: "",
  scenario: "",
  product: "",
  script: "",
  publishAt: "",
  status: "IDEA" as ContentStatus,
  workflowStage: "TOPIC" as ContentWorkflowStage,
  calendarLabel: "CAMPAIGN" as CalendarLabel,
  dataNote: "",
  selectionNotes: "",
  businessNotes: "",
  inventoryNotes: "",
  shootDate: "",
  stylingNotes: "",
  cameraNotes: "",
  voiceoverNotes: "",
  assetNotes: "",
  editBrief: "",
};

const plannerViews: Array<{ value: PlannerView; label: string }> = [
  { value: "month", label: "月" },
  { value: "week", label: "周" },
  { value: "day", label: "日" },
];

type HolidayResponse = {
  year: number;
  holidays: HolidayMarker[];
};

function comparePlans(a: ContentPlanRecord, b: ContentPlanRecord) {
  if (!a.publishAt && !b.publishAt) return a.createdAt.localeCompare(b.createdAt);
  if (!a.publishAt) return 1;
  if (!b.publishAt) return -1;
  return a.publishAt.localeCompare(b.publishAt);
}

function formatTime(value?: string | null) {
  if (!value) return "待定";
  return format(parseISO(value), "HH:mm");
}

function buildDroppedPublishAt(plan: ContentPlanRecord, targetDate: Date) {
  const base = startOfDay(targetDate);
  const sourceDate = plan.publishAt ? parseISO(plan.publishAt) : null;
  const hour = sourceDate ? getHours(sourceDate) : 10;
  const minute = sourceDate ? getMinutes(sourceDate) : 0;
  return setMinutes(setHours(base, hour), minute).toISOString();
}

function formatMonthPerspective(date: Date) {
  const nextMonthStart = startOfMonth(addMonths(date, 1));
  return `当前月：${formatPlannerPeriod(date)}，共 ${getDaysInMonth(date)} 天；${format(
    nextMonthStart,
    "M月d日 EEEE",
    { locale: zhCN },
  )}。工作节奏：${WORK_SCHEDULE_TEXT}。`;
}

function DragPlanChip({
  plan,
  onDragStart,
  onDragEnd,
}: {
  plan: ContentPlanRecord;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
}) {
  const label = resolveCalendarLabel(plan);
  const meta = getCalendarLabelMeta(label);

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, plan.id)}
      onDragEnd={onDragEnd}
      className="group flex cursor-grab items-center gap-2 rounded-2xl bg-white/90 px-2.5 py-2 text-xs active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-slate-600" />
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dotClassName)} />
      <span className="shrink-0 font-medium">{formatTime(plan.publishAt)}</span>
      <span className="truncate">{plan.title}</span>
    </div>
  );
}

function DateBadges({
  date,
  holidaysByDate,
  warmupByDate,
}: {
  date: Date;
  holidaysByDate: Map<string, HolidayMarker[]>;
  warmupByDate: Map<string, WarmupMarker[]>;
}) {
  const dateKey = toDateKey(date);
  const holiday = getHolidayMarker(dateKey, holidaysByDate);
  const warmup = getWarmupMarker(dateKey, warmupByDate);

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {holiday ? (
        <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
          {holiday.name}
        </span>
      ) : null}
      {!holiday && isWeekend(date) ? (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          假期
        </span>
      ) : null}
      {warmup ? (
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-medium",
            warmup.phase === "preheat"
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700",
          )}
        >
          {warmup.phase === "preheat" ? "直播预热期" : "节后回流期"}
        </span>
      ) : null}
    </div>
  );
}

function MonthCalendar({
  days,
  plansByDate,
  selectedDate,
  visibleDate,
  holidaysByDate,
  warmupByDate,
  dropDateKey,
  movingPlanId,
  onSelectDate,
  onPlanDragStart,
  onPlanDragEnd,
  onDragOverDate,
  onDropToDate,
}: {
  days: Date[];
  plansByDate: Map<string, ContentPlanRecord[]>;
  selectedDate: Date;
  visibleDate: Date;
  holidaysByDate: Map<string, HolidayMarker[]>;
  warmupByDate: Map<string, WarmupMarker[]>;
  dropDateKey: string | null;
  movingPlanId: string | null;
  onSelectDate: (date: Date) => void;
  onPlanDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onPlanDragEnd: () => void;
  onDragOverDate: (dateKey: string | null) => void;
  onDropToDate: (date: Date, event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="min-w-[760px]">
      <div className="grid grid-cols-7 overflow-hidden rounded-[28px] border bg-white/70">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b bg-[color:var(--panel)] px-3 py-3 text-center text-sm font-medium"
          >
            {label}
          </div>
        ))}

        {days.map((date) => {
          const dateKey = toDateKey(date);
          const dayPlans = plansByDate.get(dateKey) ?? [];
          const warmup = getWarmupMarker(dateKey, warmupByDate);
          const isSelected = isSameDay(date, selectedDate);
          const isInVisibleMonth = isSameMonth(date, visibleDate);
          const isToday = isSameDay(date, new Date());
          const isDropTarget = dropDateKey === dateKey;

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDate(date);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOverDate(dateKey);
              }}
              onDragLeave={() => onDragOverDate(null)}
              onDrop={(event) => {
                event.preventDefault();
                onDropToDate(date, event);
              }}
              role="button"
              tabIndex={0}
              className={cn(
                "min-h-40 border-b border-r p-3 text-left transition last:border-r-0",
                isInVisibleMonth ? "bg-white/70 hover:bg-white" : "bg-stone-100/65 hover:bg-stone-100",
                isSelected && "bg-white ring-2 ring-[color:var(--accent)]/25",
                isDropTarget && "bg-[color:var(--accent)]/8 ring-2 ring-[color:var(--accent)]/20",
                warmup && !isSelected && "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday
                      ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                      : isSelected
                        ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                        : "text-foreground",
                  )}
                >
                  {format(date, "d")}
                </span>
                <DateBadges
                  date={date}
                  holidaysByDate={holidaysByDate}
                  warmupByDate={warmupByDate}
                />
              </div>

              {warmup ? (
                <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                  {warmup.label}
                </div>
              ) : null}

              <div className="mt-3 space-y-1.5">
                {dayPlans.slice(0, 3).map((plan) => (
                  <DragPlanChip
                    key={plan.id}
                    plan={plan}
                    onDragStart={onPlanDragStart}
                    onDragEnd={onPlanDragEnd}
                  />
                ))}
                {dayPlans.length > 3 ? (
                  <div className="px-1 text-xs muted-text">+ {dayPlans.length - 3} 条更多内容</div>
                ) : null}
                {movingPlanId && isDropTarget ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--accent)] px-3 py-2 text-xs text-[color:var(--accent)]">
                    松手后会把内容改到这一天
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({
  days,
  plansByDate,
  selectedDate,
  holidaysByDate,
  warmupByDate,
  dropDateKey,
  movingPlanId,
  onSelectDate,
  onPlanDragStart,
  onPlanDragEnd,
  onDragOverDate,
  onDropToDate,
}: {
  days: Date[];
  plansByDate: Map<string, ContentPlanRecord[]>;
  selectedDate: Date;
  holidaysByDate: Map<string, HolidayMarker[]>;
  warmupByDate: Map<string, WarmupMarker[]>;
  dropDateKey: string | null;
  movingPlanId: string | null;
  onSelectDate: (date: Date) => void;
  onPlanDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onPlanDragEnd: () => void;
  onDragOverDate: (dateKey: string | null) => void;
  onDropToDate: (date: Date, event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="grid min-w-[760px] grid-cols-7 gap-3">
      {days.map((date) => {
        const dateKey = toDateKey(date);
        const dayPlans = plansByDate.get(dateKey) ?? [];
        const warmup = getWarmupMarker(dateKey, warmupByDate);
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const isDropTarget = dropDateKey === dateKey;

        return (
          <div
            key={dateKey}
            onClick={() => onSelectDate(date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectDate(date);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              onDragOverDate(dateKey);
            }}
            onDragLeave={() => onDragOverDate(null)}
            onDrop={(event) => {
              event.preventDefault();
              onDropToDate(date, event);
            }}
            role="button"
            tabIndex={0}
            className={cn(
              "panel-soft min-h-80 p-3 text-left transition",
              isSelected && "ring-2 ring-[color:var(--accent)]/25",
              isDropTarget && "bg-[color:var(--accent)]/8 ring-2 ring-[color:var(--accent)]/20",
              warmup && "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] muted-text">
                  {format(date, "EEEE", { locale: zhCN })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                      isToday
                        ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                        : "bg-white text-foreground",
                    )}
                  >
                    {format(date, "d")}
                  </span>
                  <div className="text-sm font-medium">
                    {format(date, "M月d日", { locale: zhCN })}
                  </div>
                </div>
              </div>

              <DateBadges
                date={date}
                holidaysByDate={holidaysByDate}
                warmupByDate={warmupByDate}
              />
            </div>

            {warmup ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                {warmup.label}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {dayPlans.length ? (
                dayPlans.map((plan) => {
                  const label = resolveCalendarLabel(plan);
                  const meta = getCalendarLabelMeta(label);

                  return (
                    <div
                      key={plan.id}
                      draggable
                      onDragStart={(event) => onPlanDragStart(event, plan.id)}
                      onDragEnd={onPlanDragEnd}
                      className={cn(
                        "cursor-grab rounded-2xl border px-3 py-3 active:cursor-grabbing",
                        meta.cardClassName,
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn("rounded-full px-2 py-1 text-[11px] font-medium", meta.pillClassName)}
                        >
                          {getCalendarLabelName(label)}
                        </span>
                        <span className="text-xs font-medium muted-text">{formatTime(plan.publishAt)}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-5">{plan.title}</div>
                      <div className="mt-2 text-xs muted-text">
                        {CONTENT_TYPE_LABELS[plan.contentType]} · {CONTENT_STATUS_LABELS[plan.status]}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed px-3 py-6 text-center text-sm muted-text">
                  这一天还没有排期
                </div>
              )}
              {movingPlanId && isDropTarget ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--accent)] px-3 py-2 text-xs text-[color:var(--accent)]">
                  松手后会把内容改到这一天
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayCalendar({
  selectedDate,
  plans,
  holidaysByDate,
  warmupByDate,
}: {
  selectedDate: Date;
  plans: ContentPlanRecord[];
  holidaysByDate: Map<string, HolidayMarker[]>;
  warmupByDate: Map<string, WarmupMarker[]>;
}) {
  const dateKey = toDateKey(selectedDate);
  const holiday = getHolidayMarker(dateKey, holidaysByDate);
  const warmup = getWarmupMarker(dateKey, warmupByDate);

  return (
    <div className="panel-soft p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="tiny-label">Day View</div>
          <div className="mt-2 text-2xl font-semibold">{formatPlannerHeader(selectedDate)}</div>
          <div className="mt-2 text-sm muted-text">
            {plans.length ? `这一天共安排 ${plans.length} 条内容` : "这一天暂时还没有安排内容"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {holiday ? (
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
              {holiday.name}
            </span>
          ) : null}
          {warmup ? (
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                warmup.phase === "preheat"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700",
              )}
            >
              {warmup.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {plans.length ? (
          plans.map((plan) => {
            const label = resolveCalendarLabel(plan);
            const meta = getCalendarLabelMeta(label);

            return (
              <div key={plan.id} className={cn("rounded-[24px] border px-4 py-4", meta.cardClassName)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium", meta.pillClassName)}>
                        {getCalendarLabelName(label)}
                      </span>
                      <Badge>{CONTENT_TYPE_LABELS[plan.contentType]}</Badge>
                      <Badge tone="accent">{getStatusSubtitle(plan.status)}</Badge>
                    </div>
                    <div className="mt-3 text-lg font-semibold">{plan.title}</div>
                  </div>

                  <div className="rounded-2xl bg-white/90 px-4 py-3 text-right text-sm">
                    <div className="muted-text">发布时间</div>
                    <div className="mt-1 font-semibold">{formatTime(plan.publishAt)}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm muted-text md:grid-cols-2">
                  <div>目标人群：{plan.audience}</div>
                  <div>场景：{plan.scenario}</div>
                  <div className="md:col-span-2">对应产品：{plan.product}</div>
                  <div className="md:col-span-2">脚本：{plan.script}</div>
                  {plan.dataNote ? <div className="md:col-span-2">数据备注：{plan.dataNote}</div> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed px-5 py-10 text-center text-sm muted-text">
            这一天是空白档期，可以拿来补直播预告、拍摄或做节后复盘。
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentPlannerClient({ initialPlans }: { initialPlans: ContentPlanRecord[] }) {
  const today = useMemo(() => getAppToday(), []);
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState(initialForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [topic, setTopic] = useState("面试穿搭直播预告");
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<PlannerView>("month");
  const [visibleDate, setVisibleDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [holidayCache, setHolidayCache] = useState<Record<number, HolidayMarker[]>>({});
  const [holidayError, setHolidayError] = useState("");
  const [dragPlanId, setDragPlanId] = useState<string | null>(null);
  const [dropDateKey, setDropDateKey] = useState<string | null>(null);
  const [movingPlanId, setMovingPlanId] = useState<string | null>(null);

  const scheduledPlans = useMemo(
    () => [...plans.filter((plan) => plan.publishAt)].sort(comparePlans),
    [plans],
  );
  const unscheduledPlans = useMemo(
    () => [...plans.filter((plan) => !plan.publishAt)].sort(comparePlans),
    [plans],
  );

  const plansByDate = useMemo(() => {
    const grouped = new Map<string, ContentPlanRecord[]>();
    for (const plan of scheduledPlans) {
      const dateKey = toDateKey(parseISO(plan.publishAt!));
      const bucket = grouped.get(dateKey) ?? [];
      bucket.push(plan);
      grouped.set(dateKey, bucket);
    }

    for (const [dateKey, bucket] of grouped.entries()) {
      grouped.set(dateKey, [...bucket].sort(comparePlans));
    }
    return grouped;
  }, [scheduledPlans]);

  useEffect(() => {
    const yearsToLoad = [visibleDate.getFullYear(), selectedDate.getFullYear()].filter(
      (year, index, years) => years.indexOf(year) === index && !holidayCache[year],
    );

    if (!yearsToLoad.length) {
      return;
    }

    let cancelled = false;

    async function loadHolidays() {
      try {
        setHolidayError("");
        const responses = await Promise.all(
          yearsToLoad.map((year) =>
            fetchJson<HolidayResponse>(`/api/calendar/holidays?year=${year}`),
          ),
        );

        if (cancelled) {
          return;
        }

        setHolidayCache((current) => {
          const next = { ...current };
          for (const response of responses) {
            next[response.year] = response.holidays;
          }
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          setHolidayError(
            error instanceof Error ? error.message : "节假日数据加载失败，先显示周末标记。",
          );
        }
      }
    }

    void loadHolidays();

    return () => {
      cancelled = true;
    };
  }, [holidayCache, selectedDate, visibleDate]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayMarker[]>();
    Object.values(holidayCache)
      .flat()
      .forEach((holiday) => {
        const bucket = map.get(holiday.dateKey) ?? [];
        bucket.push(holiday);
        map.set(holiday.dateKey, bucket);
      });
    return map;
  }, [holidayCache]);

  const warmupByDate = useMemo(() => {
    return buildHolidayWarmupMap(Object.values(holidayCache).flat());
  }, [holidayCache]);

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(visibleDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(visibleDate), { weekStartsOn: 1 }),
    });
  }, [visibleDate]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(visibleDate, { weekStartsOn: 1 }),
      end: endOfWeek(visibleDate, { weekStartsOn: 1 }),
    });
  }, [visibleDate]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDatePlans = plansByDate.get(selectedDateKey) ?? [];
  const selectedHoliday = getHolidayMarker(selectedDateKey, holidaysByDate);
  const selectedWarmup = getWarmupMarker(selectedDateKey, warmupByDate);
  const legendEntries = buildCalendarLegend();
  const workflowOverview = useMemo(
    () =>
      CONTENT_WORKFLOW_STAGE_OPTIONS.map((option) => ({
        ...option,
        count: plans.filter((plan) => plan.workflowStage === option.value).length,
      })),
    [plans],
  );

  function serializeForm() {
    return {
      ...form,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      shootDate: form.shootDate ? new Date(form.shootDate).toISOString() : null,
    };
  }

  async function createPlan() {
    try {
      if (!form.title.trim()) {
        setMessage("请先填写选题标题。");
        return;
      }

      const created = await fetchJson<ContentPlanRecord>("/api/content", {
        method: "POST",
        body: JSON.stringify(serializeForm()),
      });

      setPlans((current) => [...current, created]);
      setForm(initialForm);
      if (created.publishAt) {
        const publishDate = startOfDay(parseISO(created.publishAt));
        setVisibleDate(publishDate);
        setSelectedDate(publishDate);
      }
      setMessage("新的排期已经加入日历。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增排期失败，请稍后再试。");
    }
  }

  async function savePlan() {
    if (!editingPlanId) {
      await createPlan();
      return;
    }

    try {
      if (!form.title.trim()) {
        setMessage("请先填写选题标题。");
        return;
      }

      const updated = await fetchJson<ContentPlanRecord>(`/api/content/${editingPlanId}`, {
        method: "PATCH",
        body: JSON.stringify(serializeForm()),
      });

      setPlans((current) => current.map((plan) => (plan.id === editingPlanId ? updated : plan)));
      setEditingPlanId(null);
      setForm(initialForm);
      if (updated.publishAt) {
        const publishDate = startOfDay(parseISO(updated.publishAt));
        setVisibleDate(publishDate);
        setSelectedDate(publishDate);
      }
      setMessage("排期已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存排期失败，请稍后再试。");
    }
  }

  async function generateSuggestion() {
    try {
      const response = await fetchJson<{ suggestion: ContentSuggestion }>("/api/content/suggest", {
        method: "POST",
        body: JSON.stringify({ topic }),
      });
      setSuggestion(response.suggestion);
      setMessage("已生成内容结构建议。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成内容建议失败。");
    }
  }

  function applySuggestionToForm() {
    if (!suggestion) return;

    setForm((current) => ({
      ...current,
      title: current.title || suggestion.titles[0] || suggestion.topic,
      script: [suggestion.hook, ...suggestion.sellingPoints].join("\n"),
      workflowStage: "SCRIPT",
      stylingNotes: suggestion.stylingNotes.join("\n"),
      cameraNotes: suggestion.shotSequence.join("\n"),
      voiceoverNotes: suggestion.voiceoverLines.join("\n"),
      editBrief: suggestion.editFlow.join("\n"),
    }));
    setMessage("已把 AI 建议带入拍摄 SOP 表单。");
  }

  async function movePlanToDate(date: Date, event?: DragEvent<HTMLDivElement>) {
    const draggedId = event?.dataTransfer.getData("text/plain") || dragPlanId;
    if (!draggedId) return;

    const plan = plans.find((item) => item.id === draggedId);
    if (!plan) return;

    setMovingPlanId(plan.id);
    setDropDateKey(null);

    try {
      const updated = await fetchJson<ContentPlanRecord>(`/api/content/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          publishAt: buildDroppedPublishAt(plan, date),
        }),
      });

      setPlans((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedDate(startOfDay(date));
      setVisibleDate(startOfDay(date));
      setMessage(`已把「${updated.title}」改到 ${format(date, "M月d日", { locale: zhCN })}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "拖拽改日期失败。");
    } finally {
      setDragPlanId(null);
      setMovingPlanId(null);
    }
  }

  function startEditingPlan(plan: ContentPlanRecord) {
    setEditingPlanId(plan.id);
    setForm({
      title: plan.title,
      contentType: plan.contentType,
      audience: plan.audience,
      scenario: plan.scenario,
      product: plan.product,
      script: plan.script,
      publishAt: toDatetimeLocalValue(plan.publishAt),
      status: plan.status,
      workflowStage: plan.workflowStage,
      calendarLabel: resolveCalendarLabel(plan),
      dataNote: plan.dataNote ?? "",
      selectionNotes: plan.selectionNotes ?? "",
      businessNotes: plan.businessNotes ?? "",
      inventoryNotes: plan.inventoryNotes ?? "",
      shootDate: toDatetimeLocalValue(plan.shootDate),
      stylingNotes: plan.stylingNotes ?? "",
      cameraNotes: plan.cameraNotes ?? "",
      voiceoverNotes: plan.voiceoverNotes ?? "",
      assetNotes: plan.assetNotes ?? "",
      editBrief: plan.editBrief ?? "",
    });
    setMessage(`正在编辑「${plan.title}」`);
  }

  function cancelEditingPlan() {
    setEditingPlanId(null);
    setForm(initialForm);
    setMessage("已取消编辑。");
  }

  async function removePlan(plan: ContentPlanRecord) {
    if (!window.confirm(`确定删除排期「${plan.title}」吗？`)) return;

    await fetchJson(`/api/content/${plan.id}`, {
      method: "DELETE",
    });
    setPlans((current) => current.filter((item) => item.id !== plan.id));
    if (editingPlanId === plan.id) {
      setEditingPlanId(null);
      setForm(initialForm);
    }
    setMessage("排期已删除。");
  }

  function shiftWindow(direction: -1 | 1) {
    const nextDate =
      view === "month"
        ? addMonths(visibleDate, direction)
        : view === "week"
          ? addWeeks(visibleDate, direction)
          : addDays(visibleDate, direction);

    setVisibleDate(startOfDay(nextDate));
    setSelectedDate(startOfDay(nextDate));
  }

  function jumpToToday() {
    setVisibleDate(today);
    setSelectedDate(today);
  }

  function selectDate(date: Date) {
    const normalizedDate = startOfDay(date);
    setSelectedDate(normalizedDate);
    if (view === "day") {
      setVisibleDate(normalizedDate);
    }
  }

  function handlePlanDragStart(event: DragEvent<HTMLDivElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.dropEffect = "move";
    event.dataTransfer.setData("text/plain", id);
    setDragPlanId(id);
  }

  function handlePlanDragEnd() {
    setDragPlanId(null);
    setDropDateKey(null);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="内容排期"
        description={`把直播预告、图文、短视频统一收进一个苹果风日历视图里。默认按 ${WORK_SCHEDULE_TEXT} 看工作节奏，节假日预热会自动前移到工作日。`}
        action={
          <a className="button-secondary" href="/api/export/workbook">
            导出 Excel
          </a>
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="tiny-label">Calendar Planner</div>
            <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              <CalendarDays className="h-5 w-5" />
              苹果风排期日历
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted-text">
              颜色标签代表不同工作流。周末默认视为假期，节假日前 3 个工作日会自动进入直播预热期，节后 2 个工作日会标出回流观察期。月视图和周视图支持直接拖拽改日期。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="button-secondary h-10 w-10 px-0" onClick={() => shiftWindow(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="button-secondary" onClick={jumpToToday}>
                今天
              </button>
              <button type="button" className="button-secondary h-10 w-10 px-0" onClick={() => shiftWindow(1)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-right">
              <div className="text-lg font-semibold">
                {view === "month"
                  ? formatPlannerPeriod(visibleDate)
                  : view === "week"
                    ? `${format(weekDays[0], "M月d日", { locale: zhCN })} - ${format(weekDays[6], "M月d日", {
                        locale: zhCN,
                      })}`
                    : formatPlannerHeader(selectedDate)}
              </div>
              <div className="mt-1 text-sm muted-text">
                选中日期：{formatPlannerHeader(selectedDate)}
                {selectedHoliday ? ` · ${selectedHoliday.name}` : ""}
                {!selectedHoliday && selectedWarmup ? ` · ${selectedWarmup.label}` : ""}
              </div>
              {view === "month" ? (
                <div className="mt-1 text-sm muted-text">{formatMonthPerspective(visibleDate)}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {plannerViews.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium",
                view === option.value
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                  : "border bg-white/85",
              )}
              onClick={() => setView(option.value)}
            >
              {option.label}视图
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {legendEntries.map((entry) => (
            <div key={entry.label} className="panel-soft flex items-start gap-3 p-3">
              <span className={cn("mt-1 h-3 w-3 rounded-full", entry.meta.dotClassName)} />
              <div>
                <div className="text-sm font-semibold">{entry.name}</div>
                <div className="mt-1 text-xs leading-5 muted-text">{entry.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs muted-text">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">直播预热期：节前 3 个工作日</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">节后回流期：节后 2 个工作日</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">周末默认视为假期</span>
          <span className="rounded-full bg-white/80 px-3 py-1.5">拖拽内容卡片到日期格子即可改档期</span>
        </div>

        {holidayError ? (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {holidayError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {workflowOverview.map((stage) => (
            <div key={stage.value} className="panel-soft p-3">
              <Badge tone={workflowStageTone(stage.value)}>{CONTENT_WORKFLOW_STAGE_LABELS[stage.value]}</Badge>
              <div className="mt-3 text-2xl font-semibold">{stage.count}</div>
              <div className="mt-1 text-xs muted-text">当前处于这个 SOP 阶段的内容数</div>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          {view === "month" ? (
            <MonthCalendar
              days={monthDays}
              plansByDate={plansByDate}
              selectedDate={selectedDate}
              visibleDate={visibleDate}
              holidaysByDate={holidaysByDate}
              warmupByDate={warmupByDate}
              dropDateKey={dropDateKey}
              movingPlanId={movingPlanId}
              onSelectDate={selectDate}
              onPlanDragStart={handlePlanDragStart}
              onPlanDragEnd={handlePlanDragEnd}
              onDragOverDate={setDropDateKey}
              onDropToDate={(date, event) => void movePlanToDate(date, event)}
            />
          ) : null}

          {view === "week" ? (
            <WeekCalendar
              days={weekDays}
              plansByDate={plansByDate}
              selectedDate={selectedDate}
              holidaysByDate={holidaysByDate}
              warmupByDate={warmupByDate}
              dropDateKey={dropDateKey}
              movingPlanId={movingPlanId}
              onSelectDate={selectDate}
              onPlanDragStart={handlePlanDragStart}
              onPlanDragEnd={handlePlanDragEnd}
              onDragOverDate={setDropDateKey}
              onDropToDate={(date, event) => void movePlanToDate(date, event)}
            />
          ) : null}

          {view === "day" ? (
            <DayCalendar
              selectedDate={selectedDate}
              plans={selectedDatePlans}
              holidaysByDate={holidaysByDate}
              warmupByDate={warmupByDate}
            />
          ) : null}
        </div>
      </SectionCard>

      <div className="grid-panels xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Selected Day</div>
              <h3 className="mt-2 text-xl font-semibold">{formatPlannerHeader(selectedDate)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedHoliday ? (
                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
                  {selectedHoliday.name}
                </span>
              ) : null}
              {selectedWarmup ? (
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium",
                    selectedWarmup.phase === "preheat"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {selectedWarmup.label}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {selectedDatePlans.length ? (
              selectedDatePlans.map((plan) => {
                const label = resolveCalendarLabel(plan);
                const meta = getCalendarLabelMeta(label);

                return (
                  <div key={plan.id} className={cn("rounded-[24px] border px-4 py-4", meta.cardClassName)}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", meta.pillClassName)}>
                            {getCalendarLabelName(label)}
                          </span>
                          <Badge>{CONTENT_TYPE_LABELS[plan.contentType]}</Badge>
                          <Badge tone="accent">{CONTENT_STATUS_LABELS[plan.status]}</Badge>
                          <Badge tone={workflowStageTone(plan.workflowStage)}>
                            {CONTENT_WORKFLOW_STAGE_LABELS[plan.workflowStage]}
                          </Badge>
                        </div>
                        <div className="mt-3 text-lg font-semibold">{plan.title}</div>
                      </div>

                      <div className="rounded-2xl bg-white/85 px-4 py-3 text-sm">
                        <div className="muted-text">发布时间</div>
                        <div className="mt-1 font-semibold">{formatDateTime(plan.publishAt)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="button-secondary gap-2" onClick={() => startEditingPlan(plan)}>
                        <Pencil className="h-4 w-4" />
                        编辑
                      </button>
                      <button type="button" className="button-secondary gap-2" onClick={() => void removePlan(plan)}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white/80 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                          {"SOP"}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {CONTENT_WORKFLOW_STAGE_LABELS[plan.workflowStage]}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {plan.shootDate
                            ? `\u62cd\u6444\u65f6\u95f4\uff1a${formatDateTime(plan.shootDate)}`
                            : "\u62cd\u6444\u65f6\u95f4\uff1a\u5f85\u5b9a"}
                        </p>
                      </div>
                      {plan.selectionNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u9009\u54c1\u5907\u6ce8"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.selectionNotes}</p>
                        </div>
                      ) : null}
                      {plan.businessNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u5546\u52a1\u8ddf\u8fdb"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.businessNotes}</p>
                        </div>
                      ) : null}
                      {plan.inventoryNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u7406\u8d27\u76d8\u70b9"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.inventoryNotes}</p>
                        </div>
                      ) : null}
                      {plan.stylingNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u7a7f\u642d\u642d\u914d"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.stylingNotes}</p>
                        </div>
                      ) : null}
                      {plan.cameraNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u955c\u5934\u8bbe\u8ba1"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.cameraNotes}</p>
                        </div>
                      ) : null}
                      {plan.voiceoverNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u53e3\u64ad\u8bed\u97f3"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.voiceoverNotes}</p>
                        </div>
                      ) : null}
                      {plan.assetNotes ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u7d20\u6750\u6574\u7406"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.assetNotes}</p>
                        </div>
                      ) : null}
                      {plan.editBrief ? (
                        <div className="rounded-2xl bg-white/80 px-4 py-3 md:col-span-2">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] muted-text">
                            {"\u526a\u8f91\u811a\u672c"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{plan.editBrief}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm muted-text md:grid-cols-2">
                      <div>目标人群：{plan.audience}</div>
                      <div>场景：{plan.scenario}</div>
                      <div className="md:col-span-2">对应产品：{plan.product}</div>
                      <div className="md:col-span-2">脚本：{plan.script}</div>
                      {plan.dataNote ? <div className="md:col-span-2">数据备注：{plan.dataNote}</div> : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed px-5 py-10 text-center text-sm muted-text">
                这一天还没排内容。你可以把它留给直播预告、补拍、节后回流选题或复盘。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-semibold">新增内容排期</h3>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">选题标题</label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="例如：清明假期前通勤直播预告"
              />
            </div>

            <div>
              <label className="field-label">内容类型</label>
              <select
                value={form.contentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contentType: event.target.value as ContentType,
                  }))
                }
              >
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">当前状态</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ContentStatus,
                  }))
                }
              >
                {CONTENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">颜色标签</label>
              <label className="field-label">SOP 阶段</label>
              <select
                value={form.workflowStage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    workflowStage: event.target.value as ContentWorkflowStage,
                  }))
                }
              >
                {CONTENT_WORKFLOW_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">棰滆壊鏍囩</label>
              <select
                value={form.calendarLabel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    calendarLabel: event.target.value as CalendarLabel,
                  }))
                }
              >
                {CALENDAR_LABEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">发布时间</label>
              <input
                type="datetime-local"
                value={form.publishAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, publishAt: event.target.value }))
                }
              />
              <div className="mt-1 text-xs muted-text">
                默认工作时间按 {WORK_SCHEDULE_TEXT} 理解；如果你要做周末自动发布，也可以手动定具体时间。
              </div>
            </div>

            <div>
              <label className="field-label">目标人群</label>
              <input
                value={form.audience}
                onChange={(event) =>
                  setForm((current) => ({ ...current, audience: event.target.value }))
                }
                placeholder="例如：假期出行通勤女生"
              />
            </div>

            <div>
              <label className="field-label">场景</label>
              <input
                value={form.scenario}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scenario: event.target.value }))
                }
                placeholder="例如：节前直播预热"
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">对应产品</label>
              <input
                value={form.product}
                onChange={(event) =>
                  setForm((current) => ({ ...current, product: event.target.value }))
                }
                placeholder="例如：风衣 + 乐福鞋 + 西装裤"
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">脚本</label>
              <textarea
                className="min-h-28"
                value={form.script}
                onChange={(event) =>
                  setForm((current) => ({ ...current, script: event.target.value }))
                }
                placeholder="把开头钩子、卖点和结尾引导写在这里"
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">数据备注</label>
              <textarea
                className="min-h-24"
                value={form.dataNote}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dataNote: event.target.value }))
                }
                placeholder="例如：目标收藏率、评论区关注点、节日流量提醒"
              />
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border bg-white/70 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="tiny-label">SOP Workflow</div>
                <h4 className="mt-2 text-lg font-semibold">{"\u62cd\u6444\u94fe\u8def\u4e00\u89c8"}</h4>
              </div>
              <Badge tone={workflowStageTone(form.workflowStage)}>
                {CONTENT_WORKFLOW_STAGE_LABELS[form.workflowStage]}
              </Badge>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">{"\u62cd\u6444\u65f6\u95f4"}</label>
                <input
                  type="datetime-local"
                  value={form.shootDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shootDate: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="field-label">{"SOP \u9636\u6bb5"}</label>
                <select
                  value={form.workflowStage}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workflowStage: event.target.value as ContentWorkflowStage,
                    }))
                  }
                >
                  {CONTENT_WORKFLOW_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u9009\u54c1\u5907\u6ce8"}</label>
                <textarea
                  className="min-h-24"
                  value={form.selectionNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, selectionNotes: event.target.value }))
                  }
                  placeholder={"\u8bb0\u5f55\u4e3b\u64ad\u9009\u54c1\u7ed3\u8bba\u3001\u5957\u88c5\u7ec4\u5408\u3001\u5bf9\u5e94\u9009\u9898\u7406\u7531"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u5546\u52a1\u8ddf\u8fdb"}</label>
                <textarea
                  className="min-h-24"
                  value={form.businessNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, businessNotes: event.target.value }))
                  }
                  placeholder={"\u8bb0\u5f55\u8c08\u597d\u7684\u6b3e\u5f0f\u3001\u5230\u6837\u65f6\u95f4\u3001\u88c5\u7bb1\u60c5\u51b5\u3001\u9700\u8981\u50ac\u7684\u4eba"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u7406\u8d27\u76d8\u70b9"}</label>
                <textarea
                  className="min-h-24"
                  value={form.inventoryNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, inventoryNotes: event.target.value }))
                  }
                  placeholder={"\u5230\u6837\u540e\u7684 SKU\u3001\u989c\u8272\u3001\u5c3a\u7801\u3001\u7f3a\u8d27\u6216\u8865\u62cd\u60c5\u51b5"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u7a7f\u642d\u642d\u914d"}</label>
                <textarea
                  className="min-h-24"
                  value={form.stylingNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stylingNotes: event.target.value }))
                  }
                  placeholder={"\u5199\u660e\u4e0a\u8eab\u642d\u914d\u3001\u5185\u642d\u3001\u978b\u5305\u3001\u914d\u9970\u548c\u4e3b\u63a8\u7a7f\u642d\u987a\u5e8f"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u955c\u5934\u8bbe\u8ba1"}</label>
                <textarea
                  className="min-h-24"
                  value={form.cameraNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cameraNotes: event.target.value }))
                  }
                  placeholder={"\u5206\u955c\u987a\u5e8f\u3001\u8fd1\u666f/\u5168\u8eab\u3001\u8f6c\u573a\u52a8\u4f5c\u3001\u9700\u8981\u62cd\u7684\u5c40\u90e8\u7ec6\u8282"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u53e3\u64ad\u8bed\u97f3"}</label>
                <textarea
                  className="min-h-24"
                  value={form.voiceoverNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, voiceoverNotes: event.target.value }))
                  }
                  placeholder={"\u4e3b\u64ad\u53e3\u64ad\u8981\u70b9\u3001\u5c3a\u7801\u53c2\u8003\u3001\u9762\u6599\u611f\u53d7\u3001\u5356\u70b9\u8bed\u53e5"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u7d20\u6750\u6574\u7406"}</label>
                <textarea
                  className="min-h-24"
                  value={form.assetNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, assetNotes: event.target.value }))
                  }
                  placeholder={"\u62cd\u5b8c\u540e\u9700\u8981\u6574\u7406\u7684\u673a\u4f4d\u3001\u547d\u540d\u89c4\u5219\u3001\u5c01\u9762\u5009\u3001B-roll \u8865\u5145"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">{"\u526a\u8f91\u811a\u672c"}</label>
                <textarea
                  className="min-h-28"
                  value={form.editBrief}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, editBrief: event.target.value }))
                  }
                  placeholder={"\u7ed9\u526a\u8f91\u7684\u8282\u594f\u8981\u6c42\u3001\u5148\u540e\u987a\u5e8f\u3001\u5361\u70b9\u3001\u5b57\u5e55\u548c\u7ed3\u5c3e CTA"}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void savePlan()}>
              {editingPlanId ? "保存修改" : "加入日历"}
            </button>
            {editingPlanId ? (
              <button type="button" className="button-secondary gap-2" onClick={cancelEditingPlan}>
                <X className="h-4 w-4" />
                取消编辑
              </button>
            ) : null}
            {message ? <span className="self-center text-sm muted-text">{message}</span> : null}
          </div>
        </SectionCard>
      </div>

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

              <div className="grid gap-3 md:grid-cols-2">
                <div className="panel-soft p-4">
                  <div className="font-medium">{"\u7a7f\u642d\u642d\u914d"}</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                    {suggestion.stylingNotes.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="panel-soft p-4">
                  <div className="font-medium">{"\u955c\u5934\u8bbe\u8ba1"}</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                    {suggestion.shotSequence.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="panel-soft p-4">
                  <div className="font-medium">{"\u53e3\u64ad\u8bed\u97f3"}</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                    {suggestion.voiceoverLines.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="panel-soft p-4">
                  <div className="font-medium">{"\u526a\u8f91\u903b\u8f91"}</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 muted-text">
                    {suggestion.editFlow.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button type="button" className="button-primary" onClick={applySuggestionToForm}>
                {"\u5e26\u5165 SOP \u8868\u5355"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed px-5 py-10 text-center text-sm muted-text">
              输入一个主题，我会继续给你生成标题、钩子和卖点结构。
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Floating Queue</div>
              <h3 className="mt-2 text-xl font-semibold">待定档内容</h3>
            </div>
            <Badge>{unscheduledPlans.length} 条</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {unscheduledPlans.length ? (
              unscheduledPlans.map((plan) => {
                const label = resolveCalendarLabel(plan);
                const meta = getCalendarLabelMeta(label);

                return (
                  <div
                    key={plan.id}
                    draggable
                    onDragStart={(event) => handlePlanDragStart(event, plan.id)}
                    onDragEnd={handlePlanDragEnd}
                    className={cn(
                      "cursor-grab rounded-[24px] border px-4 py-4 active:cursor-grabbing",
                      meta.cardClassName,
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium", meta.pillClassName)}>
                        {getCalendarLabelName(label)}
                      </span>
                      <Badge>{CONTENT_TYPE_LABELS[plan.contentType]}</Badge>
                      <Badge tone="accent">{CONTENT_STATUS_LABELS[plan.status]}</Badge>
                    </div>
                    <div className="mt-3 text-lg font-semibold">{plan.title}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="button-secondary gap-2" onClick={() => startEditingPlan(plan)}>
                        <Pencil className="h-4 w-4" />
                        编辑
                      </button>
                      <button type="button" className="button-secondary gap-2" onClick={() => void removePlan(plan)}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm muted-text">
                      <GripVertical className="h-4 w-4" />
                      拖到日历中的某一天，就会自动排到当天
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed px-5 py-10 text-center text-sm muted-text">
                当前所有内容都已经有档期了。
              </div>
            )}

            {scheduledPlans.length ? (
              <div className="rounded-[24px] border bg-white/70 px-4 py-4">
                <div className="text-sm font-semibold">接下来 3 条已定档内容</div>
                <div className="mt-3 space-y-2">
                  {scheduledPlans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{plan.title}</span>
                      <span className="shrink-0 muted-text">
                        {plan.publishAt ? toDatetimeLocalValue(plan.publishAt).replace("T", " ") : "待定"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
