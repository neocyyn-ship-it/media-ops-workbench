import OpenAI from "openai";
import { NextResponse } from "next/server";

import { resolveCalendarLabel } from "@/lib/calendar";
import {
  CALENDAR_LABEL_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/options";
import {
  getDashboardSnapshot,
  listContentPlans,
  listHotTopics,
  listReportDrafts,
  listTasks,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

function summarizeTasks() {
  return listTasks()
    .slice(0, 8)
    .map((task) => {
      const dueText = task.dueAt ? `截止 ${task.dueAt}` : "未设截止时间";
      return `- ${task.title}｜${TASK_TYPE_LABELS[task.type]}｜${TASK_PRIORITY_LABELS[task.priority]}｜${TASK_STATUS_LABELS[task.status]}｜${dueText}`;
    })
    .join("\n");
}

function summarizeContentPlans() {
  return listContentPlans()
    .filter((plan) => plan.publishAt)
    .slice(0, 8)
    .map((plan) => {
      const label = resolveCalendarLabel(plan);
      return `- ${plan.title}｜${CONTENT_TYPE_LABELS[plan.contentType]}｜${CONTENT_STATUS_LABELS[plan.status]}｜${CALENDAR_LABEL_LABELS[label]}｜发布时间 ${plan.publishAt}`;
    })
    .join("\n");
}

function summarizeHotTopics() {
  return listHotTopics()
    .slice(0, 6)
    .map((topic) => `- ${topic.keyword}｜${topic.source}｜${topic.usableDirection}`)
    .join("\n");
}

function summarizeReportDraft() {
  const latest = listReportDrafts(1)[0];
  if (!latest) return "暂无日报草稿。";
  return `最近一份日报：${latest.dailyReport}\n最近一份周报草稿：${latest.weeklyDraft}`;
}

function buildWorkspaceContext() {
  const snapshot = getDashboardSnapshot();
  return [
    `今日任务数：${snapshot.counts.total}`,
    `已完成：${snapshot.counts.completed}`,
    `等待他人：${snapshot.counts.waiting}`,
    `逾期提醒：${snapshot.counts.overdue}`,
    `今日状态：${snapshot.workspaceDay.progressStatus}`,
    snapshot.workspaceDay.reviewText ? `今日复盘：${snapshot.workspaceDay.reviewText}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSystemPrompt() {
  return `
你是“个人新媒体运营工作台”里的 AI 运营助理，服务对象是服装类小红书运营。
请始终使用简体中文，语气专业、利落、可执行。
优先帮用户完成这些事：
1. 拆解任务、排优先级、补充截止时间建议
2. 生成直播预告、脚本、标题、卖点、评论区引导
3. 整理日报、周报、复盘纪要
4. 结合站内已有任务、排期和热点给出下一步建议

回答要求：
- 优先给可直接复制执行的内容
- 如果用户的问题适合列表，就给短列表
- 不要捏造站内不存在的数据；站内上下文不够时请明确说“基于当前工作台数据推断”
- 如果用户让你写内容，默认给偏新媒体运营实战风格的版本
`.trim();
}

function buildUserPrompt(message: string) {
  return `
下面是当前工作台上下文，请在回答时优先参考：

【今日工作台】
${buildWorkspaceContext()}

【任务】
${summarizeTasks() || "暂无任务。"}

【内容排期】
${summarizeContentPlans() || "暂无已定档内容。"}

【热点词】
${summarizeHotTopics() || "暂无热点词。"}

【日报草稿】
${summarizeReportDraft()}

【用户消息】
${message}
`.trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "还没有配置 OPENAI_API_KEY。请先在本地 .env.local 或 Vercel 环境变量里添加它。",
      },
      { status: 503 },
    );
  }

  const body = await request.json();
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "请输入你想让 AI 助理处理的内容。" }, { status: 400 });
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: DEFAULT_MODEL,
      max_output_tokens: 900,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: buildSystemPrompt() }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildUserPrompt(message) }],
        },
      ],
    });

    const reply = response.output_text?.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "模型没有返回可读文本，请稍后再试。" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      reply,
      model: DEFAULT_MODEL,
    });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "AI 助理调用失败，请稍后再试。";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
