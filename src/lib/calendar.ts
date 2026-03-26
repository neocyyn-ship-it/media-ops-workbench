import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { getAppDateFromKey } from "@/lib/app-time";
import {
  CALENDAR_LABEL_DESCRIPTIONS,
  CALENDAR_LABEL_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/lib/options";
import type {
  CalendarLabel,
  ContentPlanRecord,
  ContentStatus,
  HolidayMarker,
} from "@/lib/types";
import {
  collectNearbyWorkingDateKeys,
  isWeekendDate,
  WORK_SCHEDULE_TEXT,
} from "@/lib/work-schedule";

export const WEEKDAY_LABELS = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
] as const;

export { WORK_SCHEDULE_TEXT };

export type WarmupMarker = {
  dateKey: string;
  holidayName: string;
  label: string;
  phase: "preheat" | "afterglow";
};

type CalendarLabelMeta = {
  dotClassName: string;
  badgeClassName: string;
  cardClassName: string;
  pillClassName: string;
};

export const CALENDAR_LABEL_META: Record<CalendarLabel, CalendarLabelMeta> = {
  CAMPAIGN: {
    dotClassName: "bg-rose-500",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
    cardClassName: "border-rose-200 bg-rose-50/80",
    pillClassName: "bg-rose-500 text-white",
  },
  PRODUCTION: {
    dotClassName: "bg-amber-500",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    cardClassName: "border-amber-200 bg-amber-50/80",
    pillClassName: "bg-amber-500 text-white",
  },
  PUBLISH: {
    dotClassName: "bg-emerald-500",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    cardClassName: "border-emerald-200 bg-emerald-50/80",
    pillClassName: "bg-emerald-500 text-white",
  },
  REVIEW: {
    dotClassName: "bg-violet-500",
    badgeClassName: "border border-violet-200 bg-violet-50 text-violet-700",
    cardClassName: "border-violet-200 bg-violet-50/80",
    pillClassName: "bg-violet-500 text-white",
  },
  IDEA_POOL: {
    dotClassName: "bg-sky-500",
    badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
    cardClassName: "border-sky-200 bg-sky-50/80",
    pillClassName: "bg-sky-500 text-white",
  },
  FOLLOW_UP: {
    dotClassName: "bg-slate-500",
    badgeClassName: "border border-slate-200 bg-slate-50 text-slate-700",
    cardClassName: "border-slate-200 bg-slate-50/90",
    pillClassName: "bg-slate-500 text-white",
  },
};

export function isWeekend(date: Date) {
  return isWeekendDate(date);
}

export function getDefaultCalendarLabel(
  status: ContentStatus,
  contentType: ContentPlanRecord["contentType"],
) {
  if (contentType === "LIVE_TRAILER") return "CAMPAIGN";
  if (status === "REVIEWED") return "REVIEW";
  if (status === "SCHEDULED" || status === "PUBLISHED") return "PUBLISH";
  if (status === "SHOOTING" || status === "EDITING") return "PRODUCTION";
  if (status === "SCRIPTING") return "FOLLOW_UP";
  return "IDEA_POOL";
}

export function resolveCalendarLabel(plan: ContentPlanRecord) {
  return plan.calendarLabel ?? getDefaultCalendarLabel(plan.status, plan.contentType);
}

export function getCalendarLabelMeta(label: CalendarLabel) {
  return CALENDAR_LABEL_META[label];
}

export function getCalendarLabelName(label: CalendarLabel) {
  return CALENDAR_LABEL_LABELS[label];
}

export function getCalendarLabelDescription(label: CalendarLabel) {
  return CALENDAR_LABEL_DESCRIPTIONS[label];
}

export function formatPlannerHeader(date: Date) {
  return format(date, "yyyy年M月d日 EEEE", { locale: zhCN });
}

export function formatPlannerPeriod(date: Date) {
  return format(date, "yyyy年M月", { locale: zhCN });
}

export function getHolidayMarker(
  dateKey: string,
  holidaysByDate: Map<string, HolidayMarker[]>,
) {
  const markers = holidaysByDate.get(dateKey);
  return markers?.[0] ?? null;
}

export function normalizeHolidayName(name: string) {
  return name.replace(/\s+/g, " ").split(" ")[0].replace("清明節", "清明节");
}

export function buildCalendarLegend() {
  return (Object.keys(CALENDAR_LABEL_LABELS) as CalendarLabel[]).map((label) => ({
    label,
    name: CALENDAR_LABEL_LABELS[label],
    description: CALENDAR_LABEL_DESCRIPTIONS[label],
    meta: CALENDAR_LABEL_META[label],
  }));
}

export function getStatusSubtitle(status: ContentStatus) {
  return CONTENT_STATUS_LABELS[status];
}

export function buildHolidayWarmupMap(holidays: HolidayMarker[]) {
  const map = new Map<string, WarmupMarker[]>();
  const nonWorkingDateKeys = new Set(holidays.map((holiday) => holiday.dateKey));

  holidays.forEach((holiday) => {
    const holidayDate = getAppDateFromKey(holiday.dateKey);

    collectNearbyWorkingDateKeys(holidayDate, 3, "backward", nonWorkingDateKeys).forEach((dateKey) => {
      const marker: WarmupMarker = {
        dateKey,
        holidayName: holiday.name,
        label: `${holiday.name}直播预热期`,
        phase: "preheat",
      };
      const bucket = map.get(dateKey) ?? [];
      bucket.push(marker);
      map.set(dateKey, bucket);
    });

    collectNearbyWorkingDateKeys(holidayDate, 2, "forward", nonWorkingDateKeys).forEach((dateKey) => {
      const marker: WarmupMarker = {
        dateKey,
        holidayName: holiday.name,
        label: `${holiday.name}节后回流期`,
        phase: "afterglow",
      };
      const bucket = map.get(dateKey) ?? [];
      bucket.push(marker);
      map.set(dateKey, bucket);
    });
  });

  return map;
}

export function getWarmupMarker(
  dateKey: string,
  warmupByDate: Map<string, WarmupMarker[]>,
) {
  return warmupByDate.get(dateKey)?.[0] ?? null;
}
