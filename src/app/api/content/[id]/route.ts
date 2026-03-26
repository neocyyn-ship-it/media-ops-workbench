import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import { getContentPlanById, updateContentPlan } from "@/lib/repository";
import { CALENDAR_LABELS, CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getContentPlanById(id)) {
    return NextResponse.json({ error: "内容排期不存在" }, { status: 404 });
  }

  const plan = updateContentPlan(id, {
    title: body.title === undefined ? undefined : body.title?.trim(),
    contentType: isOneOf(body.contentType, CONTENT_TYPES) ? body.contentType : undefined,
    audience: body.audience === undefined ? undefined : body.audience?.trim() || "",
    scenario: body.scenario === undefined ? undefined : body.scenario?.trim() || "",
    product: body.product === undefined ? undefined : body.product?.trim() || "",
    script: body.script === undefined ? undefined : body.script?.trim() || "",
    publishAt: body.publishAt === undefined ? undefined : body.publishAt || null,
    status: isOneOf(body.status, CONTENT_STATUSES) ? body.status : undefined,
    calendarLabel: isOneOf(body.calendarLabel, CALENDAR_LABELS)
      ? body.calendarLabel
      : undefined,
    dataNote: body.dataNote === undefined ? undefined : body.dataNote?.trim() || null,
  });

  return NextResponse.json(plan);
}
