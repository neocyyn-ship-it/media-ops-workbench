import { NextResponse } from "next/server";

import { generateReportFromInput } from "@/lib/assistants";
import { saveReportDraft } from "@/lib/repository";

export async function POST(request: Request) {
  const body = await request.json();
  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json({ error: "请输入日报原始内容" }, { status: 400 });
  }

  const report = generateReportFromInput(input);
  const draft = saveReportDraft({
    rawInput: input,
    dailyReport: report.dailyReport,
    weeklyDraft: report.weeklyDraft,
    emailSubject: report.emailSubject,
    emailBody: report.emailBody,
  });

  return NextResponse.json({ draft, report });
}
