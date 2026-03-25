import { NextResponse } from "next/server";

import { suggestTasksFromText } from "@/lib/assistants";

export async function POST(request: Request) {
  const body = await request.json();
  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json({ error: "请输入需要拆解的内容" }, { status: 400 });
  }

  return NextResponse.json({ suggestions: suggestTasksFromText(input) });
}
