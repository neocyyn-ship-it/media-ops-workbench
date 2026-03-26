import { endOfWeek, startOfWeek } from "date-fns";

export const APP_TIME_ZONE = "Asia/Shanghai";
const APP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function splitDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export function getAppDateKey(date = new Date()) {
  return new Date(date.getTime() + APP_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export function getAppDateFromKey(dateKey: string) {
  const { year, month, day } = splitDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12) - APP_UTC_OFFSET_MS);
}

export function getAppToday() {
  return getAppDateFromKey(getAppDateKey());
}

export function getAppDayInterval(date = new Date()) {
  const dateKey = typeof date === "string" ? date : getAppDateKey(date);
  const { year, month, day } = splitDateKey(dateKey);
  const start = new Date(Date.UTC(year, month - 1, day) - APP_UTC_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { dateKey, start, end };
}

export function getAppWeekInterval(date = new Date()) {
  const anchorDate = typeof date === "string" ? getAppDateFromKey(date) : getAppDateFromKey(getAppDateKey(date));
  const weekStartDate = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(anchorDate, { weekStartsOn: 1 });

  return {
    start: getAppDayInterval(weekStartDate).start,
    end: getAppDayInterval(weekEndDate).end,
  };
}
