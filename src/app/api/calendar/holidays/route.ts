import { format } from "date-fns";
import Holidays from "date-holidays";
import { NextResponse } from "next/server";

import { normalizeHolidayName } from "@/lib/calendar";
import type { HolidayMarker } from "@/lib/types";

export const dynamic = "force-dynamic";

const holidayService = new Holidays("CN", { languages: ["zh"] });
const statutoryHolidayPattern = /元旦|春节|清明|劳动|端午|中秋|国庆/;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  if (!Number.isInteger(year) || year < 2020 || year > 2035) {
    return NextResponse.json({ error: "年份不在支持范围内" }, { status: 400 });
  }

  const holidays = holidayService
    .getHolidays(year)
    .filter((holiday) => holiday.type === "public")
    .filter((holiday) => statutoryHolidayPattern.test(holiday.name))
    .reduce<HolidayMarker[]>((items, holiday) => {
      const dateKey = format(holiday.start, "yyyy-MM-dd");
      const normalizedName = normalizeHolidayName(holiday.name);
      if (
        items.some((item) => item.dateKey === dateKey && item.name === normalizedName)
      ) {
        return items;
      }

      items.push({
        dateKey,
        name: normalizedName,
        type: "holiday",
      });
      return items;
    }, []);

  return NextResponse.json({ year, holidays });
}
