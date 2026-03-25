import { clsx } from "clsx";
import {
  endOfDay,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function toDateKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "未安排";
  return format(parseISO(value), "M月d日 HH:mm", { locale: zhCN });
}

export function formatDateOnly(value?: string | null) {
  if (!value) return "未设置";
  return format(parseISO(value), "M月d日", { locale: zhCN });
}

export function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

export function isTodayIso(value?: string | null) {
  if (!value) return false;
  return isSameDay(parseISO(value), new Date());
}

export function isThisWeekIso(value?: string | null) {
  if (!value) return false;
  const date = parseISO(value);
  return isWithinInterval(date, {
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
}

export function isOverdueIso(value?: string | null) {
  if (!value) return false;
  const date = parseISO(value);
  return isBefore(date, new Date());
}

export function isInTodayWindow(value?: string | null) {
  if (!value) return false;
  const date = parseISO(value);
  return isWithinInterval(date, {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });
}

export function relativeDateLabel(value?: string | null) {
  if (!value) return "未安排";
  const date = parseISO(value);
  if (isSameDay(date, new Date())) return `今天 ${format(date, "HH:mm")}`;
  if (isAfter(date, new Date())) return format(date, "M月d日 HH:mm", { locale: zhCN });
  return `已过期 ${format(date, "M月d日 HH:mm", { locale: zhCN })}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function textToTags(value: string) {
  return value
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
