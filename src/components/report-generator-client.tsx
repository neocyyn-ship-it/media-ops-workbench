"use client";

import { Copy, FileDown, Mail, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { VoiceInput } from "@/components/voice-input";
import { fetchJson } from "@/lib/client-fetch";
import type { GeneratedReport, ReportDraftRecord } from "@/lib/types";
import { downloadBlob } from "@/lib/utils";

function draftToGenerated(draft: ReportDraftRecord): GeneratedReport {
  const markdown = `# 日报\n\n${draft.dailyReport}\n\n# 周报草稿\n\n${draft.weeklyDraft}\n\n# 邮件模板\n\n主题：${draft.emailSubject}\n\n${draft.emailBody}`;
  const text = `日报\n${draft.dailyReport}\n\n周报草稿\n${draft.weeklyDraft}\n\n邮件主题：${draft.emailSubject}\n\n${draft.emailBody}`;
  return {
    dailyReport: draft.dailyReport,
    weeklyDraft: draft.weeklyDraft,
    emailSubject: draft.emailSubject,
    emailBody: draft.emailBody,
    markdown,
    text,
  };
}

export function ReportGeneratorClient({
  initialDrafts,
}: {
  initialDrafts: ReportDraftRecord[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [input, setInput] = useState(
    "今天拍了4小时，跟进了摄影，出了1条文案，明天要对货和跟主播对搭配。",
  );
  const [generated, setGenerated] = useState<GeneratedReport | null>(
    initialDrafts[0] ? draftToGenerated(initialDrafts[0]) : null,
  );
  const [message, setMessage] = useState("");

  async function generateReport() {
    if (!input.trim()) {
      setMessage("请先输入今天的口语化工作记录。");
      return;
    }
    const response = await fetchJson<{ draft: ReportDraftRecord; report: GeneratedReport }>(
      "/api/reports/generate",
      {
        method: "POST",
        body: JSON.stringify({ input }),
      },
    );
    setGenerated(response.report);
    setDrafts((current) => [response.draft, ...current]);
    setMessage("日报和周报草稿已生成。");
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label}已复制。`);
  }

  async function exportReport(format: "txt" | "md" | "docx") {
    if (!generated) return;
    const response = await fetch("/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, report: generated }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "导出失败");
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fallback = `日报导出.${format}`;
    const filename = disposition.match(/filename="(.+)"/)?.[1] ?? fallback;
    downloadBlob(blob, filename);
    setMessage(`已导出 ${format.toUpperCase()}。`);
  }

  async function testEmailApi() {
    const response = await fetchJson<{ todo: string }>("/api/email/send", {
      method: "POST",
      body: JSON.stringify({
        subject: generated?.emailSubject ?? "",
        body: generated?.emailBody ?? "",
      }),
    }).catch((error) => {
      if (error instanceof Error) return { todo: error.message };
      return { todo: "邮件接口暂未启用" };
    });
    setMessage(response.todo);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="日报生成器"
        description="支持口语化输入、浏览器语音转文字、自动整理日报与周报草稿，并导出为文本、Markdown、Docx 友好格式。"
        action={<Badge tone="accent">企业微信先走复制/导出方案</Badge>}
      />

      <div className="grid-panels xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Input</div>
              <h3 className="mt-2 text-xl font-semibold">口语化输入</h3>
            </div>
            <VoiceInput onTranscript={(text) => setInput((current) => `${current}${current ? "\n" : ""}${text}`)} />
          </div>

          <textarea
            className="mt-4 min-h-40"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：今天拍了4小时，跟进了摄影，出了1条文案，明天要对货和跟主播对搭配"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={() => void generateReport()}>
              <Sparkles className="h-4 w-4" />
              生成日报
            </button>
            <button type="button" className="button-secondary gap-2" onClick={() => void testEmailApi()}>
              <Mail className="h-4 w-4" />
              测试邮件接口
            </button>
          </div>

          <div className="mt-4 rounded-3xl border bg-white/80 p-4 text-sm leading-6 muted-text">
            邮箱联动当前为预留接口，暂未接入 SMTP。
            企业微信当前采用复制文本 / Markdown 或导出文件的兼容方案。
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tiny-label">Output</div>
              <h3 className="mt-2 text-xl font-semibold">生成结果</h3>
            </div>
            {generated ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-secondary gap-2" onClick={() => void exportReport("txt")}>
                  <FileDown className="h-4 w-4" />
                  TXT
                </button>
                <button type="button" className="button-secondary gap-2" onClick={() => void exportReport("md")}>
                  <FileDown className="h-4 w-4" />
                  Markdown
                </button>
                <button type="button" className="button-secondary gap-2" onClick={() => void exportReport("docx")}>
                  <FileDown className="h-4 w-4" />
                  Docx
                </button>
              </div>
            ) : null}
          </div>

          {generated ? (
            <div className="mt-4 space-y-3">
              <div className="panel-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">日报</div>
                  <button
                    type="button"
                    className="button-secondary gap-2"
                    onClick={() => void copyText(generated.dailyReport, "日报")}
                  >
                    <Copy className="h-4 w-4" />
                    复制
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 muted-text">{generated.dailyReport}</p>
              </div>
              <div className="panel-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">周报草稿</div>
                  <button
                    type="button"
                    className="button-secondary gap-2"
                    onClick={() => void copyText(generated.weeklyDraft, "周报草稿")}
                  >
                    <Copy className="h-4 w-4" />
                    复制
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 muted-text">{generated.weeklyDraft}</p>
              </div>
              <div className="panel-soft p-4">
                <div className="font-medium">邮件模板</div>
                <div className="mt-3 text-sm">
                  <div className="font-medium text-foreground">主题：{generated.emailSubject}</div>
                  <p className="mt-3 whitespace-pre-wrap leading-6 muted-text">{generated.emailBody}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button-secondary gap-2"
                    onClick={() => void copyText(generated.emailBody, "邮件正文")}
                  >
                    <Copy className="h-4 w-4" />
                    复制邮件正文
                  </button>
                  <button
                    type="button"
                    className="button-secondary gap-2"
                    onClick={() => void copyText(generated.markdown, "Markdown 模板")}
                  >
                    <Copy className="h-4 w-4" />
                    复制 Markdown
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border bg-white/70 p-6 text-sm muted-text">
              先输入一段口语化工作记录，再点“生成日报”。
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="tiny-label">History</div>
            <h3 className="mt-2 text-xl font-semibold">最近生成记录</h3>
          </div>
          <Badge>{drafts.length} 条</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              type="button"
              className="panel-soft p-4 text-left hover:bg-white"
              onClick={() => setGenerated(draftToGenerated(draft))}
            >
              <div className="flex flex-wrap gap-2">
                <Badge>{draft.emailSubject}</Badge>
                <Badge>{new Date(draft.createdAt).toLocaleString("zh-CN")}</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 muted-text">{draft.dailyReport}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      {message ? <div className="rounded-full border bg-white/90 px-4 py-3 text-sm">{message}</div> : null}
    </div>
  );
}
