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
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
} from "@/lib/options";
import type {
  CalendarLabel,
  ContentPlanRecord,
  ContentStatus,
  ContentSuggestion,
  ContentType,
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
  calendarLabel: "CAMPAIGN" as CalendarLabel,
  dataNote: "",
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
  )}。`;
}

function DragPlanChip({
  plan,
  onDragStart,
  onDragEnd,
}: {
  plan: ContentPlanRecord;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const label = resolveCalendarLabel(plan);
  const meta = getCalendarLabelMeta(label);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(plan.id)}
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
          周末
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
  onPlanDragStart: (id: string) => void;
  onPlanDragEnd: () => void;
  onDragOverDate: (dateKey: string | null) => void;
  onDropToDate: (date: Date) => void;
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
                onDropToDate(date);
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
  onPlanDragStart: (id: string) => void;
  onPlanDragEnd: () => void;
  onDragOverDate: (dateKey: string | null) => void;
  onDropToDate: (date: Date) => void;
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
              onDropToDate(date);
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
                      onDragStart={() => onPlanDragStart(plan.id)}
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

  async function createPlan() {
    try {
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

  async function movePlanToDate(date: Date) {
    if (!dragPlanId) return;

    const plan = plans.find((item) => item.id === dragPlanId);
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

  function handlePlanDragStart(id: string) {
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
        description="把直播预告、图文、短视频统一收进一个苹果风日历视图里。现在支持颜色标签、节假日提示、周/月/日切换、拖拽改日期，以及节假日前后的直播预热提醒。"
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
              颜色标签代表不同工作流，节假日前 3 天会自动进入直播预热期，节后 2 天会标出回流观察期。月视图和周视图支持直接拖拽改日期。
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
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">直播预热期：节前 3 天</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">节后回流期：节后 2 天</span>
          <span className="rounded-full bg-white/80 px-3 py-1.5">拖拽内容卡片到日期格子即可改档期</span>
        </div>

        {holidayError ? (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {holidayError}
          </div>
        ) : null}

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
              onDropToDate={(date) => void movePlanToDate(date)}
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
              onDropToDate={(date) => void movePlanToDate(date)}
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
                        </div>
                        <div className="mt-3 text-lg font-semibold">{plan.title}</div>
                      </div>

                      <div className="rounded-2xl bg-white/85 px-4 py-3 text-sm">
                        <div className="muted-text">发布时间</div>
                        <div className="mt-1 font-semibold">{formatDateTime(plan.publishAt)}</div>
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={() => void createPlan()}>
              加入日历
            </button>
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
                    onDragStart={() => handlePlanDragStart(plan.id)}
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
