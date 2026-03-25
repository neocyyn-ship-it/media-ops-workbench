import { NextResponse } from "next/server";

import { createHotTopic, listHotTopics } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import { TOPIC_TYPES } from "@/lib/types";

export function GET() {
  return NextResponse.json({ items: listHotTopics() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.keyword?.trim()) {
    return NextResponse.json({ error: "关键词不能为空" }, { status: 400 });
  }

  const item = createHotTopic({
    keyword: body.keyword.trim(),
    type: isOneOf(body.type, TOPIC_TYPES) ? body.type : "TREND",
    source: body.source?.trim() || "待补充",
    happenedAt: body.happenedAt || null,
    usableDirection: body.usableDirection?.trim() || "待补充",
  });

  return NextResponse.json(item);
}
