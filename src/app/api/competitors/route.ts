import { NextResponse } from "next/server";

import {
  createCompetitorObservation,
  listCompetitorObservations,
} from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import { PLATFORMS } from "@/lib/types";

export function GET() {
  return NextResponse.json({ items: listCompetitorObservations() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.accountName?.trim() || !body.contentTopic?.trim()) {
    return NextResponse.json({ error: "账号名和内容主题不能为空" }, { status: 400 });
  }

  const item = createCompetitorObservation({
    accountName: body.accountName.trim(),
    platform: isOneOf(body.platform, PLATFORMS) ? body.platform : "XIAOHONGSHU",
    contentLink: body.contentLink?.trim() || null,
    contentTopic: body.contentTopic.trim(),
    hookPoint: body.hookPoint?.trim() || "待补充",
    commentInsight: body.commentInsight?.trim() || "待补充",
    takeaway: body.takeaway?.trim() || "待补充",
  });

  return NextResponse.json(item);
}
