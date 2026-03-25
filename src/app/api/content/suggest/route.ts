import { NextResponse } from "next/server";

import { generateContentSuggestion } from "@/lib/assistants";

export async function POST(request: Request) {
  const body = await request.json();
  const topic = body.topic?.trim();
  if (!topic) {
    return NextResponse.json({ error: "请输入主题" }, { status: 400 });
  }
  return NextResponse.json({ suggestion: generateContentSuggestion(topic) });
}
