import {
  addDays,
  getDay,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";

import { toDateKey } from "@/lib/utils";

export const WORK_SCHEDULE_TEXT = "周一到周五 09:30-18:30";
export const WORK_START_HOUR = 9;
export const WORK_START_MINUTE = 30;
export const WORK_END_HOUR = 18;
export const WORK_END_MINUTE = 30;

export function isWeekendDate(date: Date) {
  const weekday = getDay(date);
  return weekday === 0 || weekday === 6;
}

export function isWorkingDay(
  date: Date,
  nonWorkingDateKeys: Set<string> = new Set(),
) {
  return !isWeekendDate(date) && !nonWorkingDateKeys.has(toDateKey(date));
}

export function getNearestWorkingDate(
  date: Date,
  direction: "forward" | "backward" = "forward",
  nonWorkingDateKeys: Set<string> = new Set(),
) {
  let cursor = startOfDay(date);

  while (!isWorkingDay(cursor, nonWorkingDateKeys)) {
    cursor = addDays(cursor, direction === "forward" ? 1 : -1);
  }

  return cursor;
}

export function collectNearbyWorkingDateKeys(
  anchorDate: Date,
  count: number,
  direction: "forward" | "backward",
  nonWorkingDateKeys: Set<string> = new Set(),
) {
  const dateKeys: string[] = [];
  let cursor = startOfDay(anchorDate);

  while (dateKeys.length < count) {
    cursor = addDays(cursor, direction === "forward" ? 1 : -1);
    if (isWorkingDay(cursor, nonWorkingDateKeys)) {
      dateKeys.push(toDateKey(cursor));
    }
  }

  return dateKeys;
}

export function buildWorkingDateTime(
  baseDate: Date,
  options?: {
    hour?: number;
    minute?: number;
    direction?: "forward" | "backward";
    nonWorkingDateKeys?: Set<string>;
  },
) {
  const targetDate = getNearestWorkingDate(
    baseDate,
    options?.direction ?? "forward",
    options?.nonWorkingDateKeys,
  );

  const startMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE;
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE;
  const requestedMinutes = (options?.hour ?? WORK_START_HOUR) * 60 + (options?.minute ?? WORK_START_MINUTE);
  const boundedMinutes = Math.max(startMinutes, Math.min(endMinutes, requestedMinutes));

  return setMinutes(
    setHours(startOfDay(targetDate), Math.floor(boundedMinutes / 60)),
    boundedMinutes % 60,
  );
}
