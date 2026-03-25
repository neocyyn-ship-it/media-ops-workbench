import { NextResponse } from "next/server";

import { saveWorkspaceDay } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import { WORKSPACE_PROGRESS } from "@/lib/types";

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.dateKey) {
    return NextResponse.json({ error: "缺少日期" }, { status: 400 });
  }

  const day = saveWorkspaceDay(body.dateKey, {
    progressStatus: isOneOf(body.progressStatus, WORKSPACE_PROGRESS)
      ? body.progressStatus
      : undefined,
    morningFocus:
      body.morningFocus === undefined ? undefined : body.morningFocus?.trim() || null,
    reviewText:
      body.reviewText === undefined ? undefined : body.reviewText?.trim() || null,
    tomorrowPlan:
      body.tomorrowPlan === undefined ? undefined : body.tomorrowPlan?.trim() || null,
  });

  return NextResponse.json(day);
}
