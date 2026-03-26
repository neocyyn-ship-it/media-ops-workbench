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
import { WORK_SCHEDULE_TEXT } from "@/lib/work-schedule";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const CUSTOM_BASE_URL = process.env.OPENAI_BASE_URL?.trim() || "";

function summarizeTasks() {
  return listTasks()
    .slice(0, 8)
    .map((task) => {
      const dueText = task.dueAt ? `截止 ${task.dueAt}` : "未设置截止时间";
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
用户默认工作时间是 ${WORK_SCHEDULE_TEXT}，周末默认不安排人工工作；节假日预热请尽量前移到之前的工作日完成。

优先帮助用户：
1. 拆解任务、排优先级、补充截止时间建议
2. 生成直播预告、脚本、标题、卖点、评论区引导
3. 整理日报、周报、复盘纪要
4. 结合站内已有任务、排期和热点给出下一步建议

回答要求：
- 优先给可直接复制执行的内容
- 适合列表时就给短列表
- 不要使用 Markdown 标题、粗体、代码块，不要输出 ###、**、三个反引号 这类标记
- 默认用纯文本分段：先给一句结论，再给 1. 2. 3. 的短列表
- 每一条尽量短，适合手机上快速浏览
- 不要捏造站内不存在的数据；上下文不足时明确说“基于当前工作台数据推断”
- 如果用户让你写内容，默认给偏新媒体运营实战风格的版本
`.trim();
}

function buildUserPrompt(message: string) {
  return `
下面是当前工作台上下文，请在回答时优先参考：

[今日工作台]
${buildWorkspaceContext()}

[任务]
${summarizeTasks() || "暂无任务。"}

[内容排期]
${summarizeContentPlans() || "暂无已定档内容。"}

[热点词]
${summarizeHotTopics() || "暂无热点词。"}

[日报草稿]
${summarizeReportDraft()}

[用户消息]
${message}
`.trim();
}

function normalizeBaseUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return /\/v\d+$/i.test(normalized) ? normalized : `${normalized}/v1`;
}

function buildCompatibleModelCandidates() {
  return [...new Set([DEFAULT_MODEL, "gpt-5-mini", "gpt-4o-mini", "gpt-4.1-mini"])];
}

function isModelCompatibilityError(error: { status?: number; message: string }) {
  if (error.status !== 400 && error.status !== 404) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("model") &&
    (message.includes("not found") ||
      message.includes("unsupported") ||
      message.includes("does not exist") ||
      message.includes("invalid"))
  );
}

async function callCompatibleChatApi(apiKey: string, message: string) {
  const client = new OpenAI({
    apiKey,
    baseURL: normalizeBaseUrl(CUSTOM_BASE_URL),
    defaultHeaders: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  let lastFailure: { status: number; message: string } | null = null;

  for (const model of buildCompatibleModelCandidates()) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt(message),
          },
        ],
      });

      const reply = response.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        lastFailure = {
          status: 502,
          message: "兼容接口没有返回可读文本。",
        };
        continue;
      }

      return {
        ok: true,
        status: 200,
        reply,
        model,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError && isModelCompatibilityError(error)) {
        lastFailure = {
          status: error.status ?? 400,
          message: error.message || "当前模型在第三方兼容接口中不可用。",
        };
        continue;
      }

      if (error instanceof OpenAI.APIError) {
        return {
          ok: false,
          status: error.status ?? 500,
          message: error.message || "兼容接口调用失败。",
        };
      }

      throw error;
    }
  }

  return {
    ok: false,
    status: lastFailure?.status ?? 500,
    message: lastFailure?.message || "兼容接口调用失败。",
  };
}

function formatAssistantError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return {
        status: 401,
        error:
          "AI 接口鉴权失败。请确认当前配置的是可用的 API Key；如果你使用的是第三方兼容接口，请同时配置 OPENAI_BASE_URL。",
      };
    }

    if (error.status === 429) {
      return {
        status: 429,
        error: "AI 调用达到频率或额度限制，请稍后重试。",
      };
    }

    return {
      status: error.status ?? 500,
      error: "AI 助理调用失败，请稍后再试。",
    };
  }

  return {
    status: 500,
    error: "AI 助理调用失败，请稍后再试。",
  };
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

  if (CUSTOM_BASE_URL) {
    try {
      const result = await callCompatibleChatApi(apiKey, message);
      if (!result.ok) {
        const errorMessage =
          result.status === 401
            ? "第三方兼容接口鉴权失败。请确认 OPENAI_API_KEY 和 OPENAI_BASE_URL 对应且有效。"
            : result.message;
        return NextResponse.json({ error: errorMessage }, { status: result.status });
      }

      return NextResponse.json({
        reply: result.reply,
        model: result.model,
        baseUrl: CUSTOM_BASE_URL,
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "第三方兼容接口调用失败。请检查 OPENAI_BASE_URL 是否正确，并确认该服务兼容 /chat/completions。",
        },
        { status: 500 },
      );
    }
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
    const formatted = formatAssistantError(error);
    return NextResponse.json({ error: formatted.error }, { status: formatted.status });
  }
}
