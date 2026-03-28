import { NextResponse } from "next/server";

import { suggestHotTopicsFromText } from "@/lib/assistants";

export async function POST(request: Request) {
  const body = await request.json();
  const input = body.input?.trim();
  const source = body.source?.trim();

  if (!input) {
    return NextResponse.json({ error: "请输入要识别的热点原文" }, { status: 400 });
  }

  return NextResponse.json({
    suggestions: suggestHotTopicsFromText(input, source || "AI 热点雷达"),
  });
}
