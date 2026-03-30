import { NextResponse } from "next/server";

import { getAppDateKey } from "@/lib/app-time";
import { isOneOf } from "@/lib/options";
import { createWeeklyEngagement, listWeeklyEngagements } from "@/lib/repository";
import {
  WEEKLY_ENGAGEMENT_ROLES,
  WEEKLY_ENGAGEMENT_STATUSES,
  WEEKLY_ENGAGEMENT_TYPES,
} from "@/lib/types";

function normalizeLinks(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(/[\n,，\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function GET() {
  return NextResponse.json({ engagements: listWeeklyEngagements() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "璇峰厛濉啓瀵规帴鏍囬" }, { status: 400 });
  }
  if (!body.contactName?.trim()) {
    return NextResponse.json({ error: "璇峰厛濉啓瀵规帴浜?" }, { status: 400 });
  }

  const dateValue = typeof body.date === "string" && body.date.trim() ? body.date.trim() : getAppDateKey();

  const created = createWeeklyEngagement({
    title: body.title.trim(),
    type: isOneOf(body.type, WEEKLY_ENGAGEMENT_TYPES) ? body.type : "MEETING",
    date: dateValue,
    time: body.time?.trim() || null,
    contactName: body.contactName.trim(),
    contactRole: isOneOf(body.contactRole, WEEKLY_ENGAGEMENT_ROLES)
      ? body.contactRole
      : "COLLEAGUE",
    note: body.note?.trim() || null,
    referenceLinks: normalizeLinks(body.referenceLinks),
    status: isOneOf(body.status, WEEKLY_ENGAGEMENT_STATUSES) ? body.status : "PENDING",
    remark: body.remark?.trim() || null,
  });

  return NextResponse.json(created);
}
