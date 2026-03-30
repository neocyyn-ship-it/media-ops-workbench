import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import {
  deleteWeeklyEngagement,
  getWeeklyEngagementById,
  updateWeeklyEngagement,
} from "@/lib/repository";
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
      .split(/[\n,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getWeeklyEngagementById(id)) {
    return NextResponse.json({ error: "对接记录不存在" }, { status: 404 });
  }

  const updated = updateWeeklyEngagement(id, {
    title: body.title?.trim(),
    type: isOneOf(body.type, WEEKLY_ENGAGEMENT_TYPES) ? body.type : undefined,
    date: body.date?.trim(),
    time: body.time === undefined ? undefined : body.time?.trim() || null,
    contactName: body.contactName?.trim(),
    contactRole: isOneOf(body.contactRole, WEEKLY_ENGAGEMENT_ROLES)
      ? body.contactRole
      : undefined,
    note: body.note === undefined ? undefined : body.note?.trim() || null,
    referenceLinks: body.referenceLinks === undefined ? undefined : normalizeLinks(body.referenceLinks),
    status: isOneOf(body.status, WEEKLY_ENGAGEMENT_STATUSES) ? body.status : undefined,
    remark: body.remark === undefined ? undefined : body.remark?.trim() || null,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getWeeklyEngagementById(id)) {
    return NextResponse.json({ error: "对接记录不存在" }, { status: 404 });
  }

  const record = deleteWeeklyEngagement(id);
  return NextResponse.json(record);
}
