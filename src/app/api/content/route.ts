import { NextResponse } from "next/server";

import { createContentPlan, listContentPlans } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import { CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/types";

export function GET() {
  return NextResponse.json({ plans: listContentPlans() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "选题标题不能为空" }, { status: 400 });
  }

  const plan = createContentPlan({
    title: body.title.trim(),
    contentType: isOneOf(body.contentType, CONTENT_TYPES)
      ? body.contentType
      : "LIVE_TRAILER",
    audience: body.audience?.trim() || "待补充",
    scenario: body.scenario?.trim() || "待补充",
    product: body.product?.trim() || "待补充",
    script: body.script?.trim() || "待补充",
    publishAt: body.publishAt || null,
    status: isOneOf(body.status, CONTENT_STATUSES) ? body.status : "IDEA",
    dataNote: body.dataNote?.trim() || null,
  });

  return NextResponse.json(plan);
}
