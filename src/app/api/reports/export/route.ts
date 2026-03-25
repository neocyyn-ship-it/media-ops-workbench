import { NextResponse } from "next/server";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { timestampedFilename } from "@/lib/assistants";
import type { GeneratedReport } from "@/lib/types";

function createFileResponse(
  content: ArrayBuffer | Uint8Array,
  filename: string,
  contentType: string,
) {
  const payload =
    content instanceof Uint8Array ? new Uint8Array(content) : new Uint8Array(content);
  return new Response(new Blob([payload], { type: contentType }), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    format?: "txt" | "md" | "docx";
    report?: GeneratedReport;
  };

  if (!body.format || !body.report) {
    return NextResponse.json({ error: "缺少导出内容" }, { status: 400 });
  }

  if (body.format === "txt") {
    return createFileResponse(
      new TextEncoder().encode(body.report.text),
      timestampedFilename("daily-report", "txt"),
      "text/plain; charset=utf-8",
    );
  }

  if (body.format === "md") {
    return createFileResponse(
      new TextEncoder().encode(body.report.markdown),
      timestampedFilename("daily-report", "md"),
      "text/markdown; charset=utf-8",
    );
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun("日报导出")],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("日报")],
          }),
          ...body.report.dailyReport
            .split("\n")
            .filter(Boolean)
            .map((line) => new Paragraph(line)),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("周报草稿")],
          }),
          ...body.report.weeklyDraft
            .split("\n")
            .filter(Boolean)
            .map((line) => new Paragraph(line)),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("邮件模板")],
          }),
          new Paragraph(`主题：${body.report.emailSubject}`),
          ...body.report.emailBody
            .split("\n")
            .filter(Boolean)
            .map((line) => new Paragraph(line)),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return createFileResponse(
    buffer,
    timestampedFilename("daily-report", "docx"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}
