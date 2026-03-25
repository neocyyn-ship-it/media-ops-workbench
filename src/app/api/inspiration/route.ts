import { NextResponse } from "next/server";

import { createInspirationItem, listInspirationItems } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import { INSPIRATION_TYPES } from "@/lib/types";

export function GET() {
  return NextResponse.json({ items: listInspirationItems() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.sourceAccount?.trim() || !body.hookSummary?.trim()) {
    return NextResponse.json(
      { error: "来源账号和爆点总结不能为空" },
      { status: 400 },
    );
  }

  const item = createInspirationItem({
    link: body.link?.trim() || null,
    screenshot: body.screenshot?.trim() || null,
    sourceAccount: body.sourceAccount.trim(),
    type: isOneOf(body.type, INSPIRATION_TYPES) ? body.type : "TITLE",
    hookSummary: body.hookSummary.trim(),
    reusableIdea: body.reusableIdea?.trim() || "待补充",
    tags: body.tags?.trim() || "未分类",
  });

  return NextResponse.json(item);
}
