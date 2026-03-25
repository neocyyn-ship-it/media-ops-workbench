import { addDays, format, setHours, setMinutes, startOfDay } from "date-fns";

import type {
  ContentSuggestion,
  GeneratedReport,
  TaskPriority,
  TaskSuggestion,
  TaskType,
} from "@/lib/types";

function normalizeText(input: string) {
  return input.replace(/\r/g, "").replace(/[；;]/g, "。").replace(/[，,]/g, "。").trim();
}

function splitSegments(input: string) {
  return normalizeText(input)
    .split(/[。\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function inferTaskType(text: string): TaskType {
  if (/摄影|拍摄|补拍|出镜/.test(text)) return "SHOOTING";
  if (/对货|库存|货盘|补货/.test(text)) return "STOCK";
  if (/直播|主播|口播/.test(text)) return "LIVE";
  if (/学习|复盘模板|拆解/.test(text)) return "LEARNING";
  if (/数据|复盘|成交|停留|转化/.test(text)) return "DATA";
  if (/竞品|同行|账号/.test(text)) return "COMPETITOR";
  if (/热点|热词|选题池|联想词/.test(text)) return "HOTTOPIC";
  return "CONTENT";
}

function inferTaskPriority(text: string): TaskPriority {
  if (/先|重点|必须|确认/.test(text)) return "CRITICAL";
  if (/今天|今晚|明天|下午|晚上|\d{1,2}点/.test(text)) return "HIGH";
  if (/整理|汇总|学习/.test(text)) return "MEDIUM";
  return "MEDIUM";
}

function extractDueAt(text: string) {
  const now = new Date();
  let base = startOfDay(now);

  if (/后天/.test(text)) base = addDays(base, 2);
  else if (/明天|明早|明晚/.test(text)) base = addDays(base, 1);
  else if (/下周/.test(text)) base = addDays(base, 7);

  const timeMatch = text.match(/(\d{1,2})点(?:(\d{1,2})分?)?/);
  let hour = 18;
  let minute = 0;

  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    if (/下午|晚上/.test(text) && hour < 12) hour += 12;
    if (/中午/.test(text) && hour < 11) hour += 12;
  } else if (/早上|上午|明早/.test(text)) {
    hour = 10;
  } else if (/中午/.test(text)) {
    hour = 12;
  } else if (/下午/.test(text)) {
    hour = 15;
  } else if (/晚上|今晚|明晚/.test(text)) {
    hour = 20;
  } else if (/今天/.test(text)) {
    hour = 18;
  } else if (/明天/.test(text)) {
    hour = 10;
  } else {
    return null;
  }

  return setMinutes(setHours(base, hour), minute).toISOString();
}

function cleanTaskTitle(segment: string) {
  return segment
    .replace(/^(今天|今晚|明天|后天|下周|本周|明早|明晚|早上|上午|中午|下午|晚上)/, "")
    .replace(/^\d{1,2}点(?:\d{1,2}分?)?/, "")
    .replace(/^(先|再|然后|还要|需要|和)/, "")
    .trim();
}

export function suggestTasksFromText(input: string): TaskSuggestion[] {
  return splitSegments(input).map((segment) => {
    const title = cleanTaskTitle(segment) || segment;
    return {
      title,
      type: inferTaskType(segment),
      priority: inferTaskPriority(segment),
      dueAt: extractDueAt(segment),
      notes: `由快速输入自动拆解：${segment}`,
    };
  });
}

function inferTheme(input: string) {
  if (/面试/.test(input)) return "面试穿搭";
  if (/直播/.test(input)) return "直播运营";
  if (/通勤/.test(input)) return "通勤穿搭";
  if (/毕业/.test(input)) return "毕业季选题";
  return "新媒体运营";
}

export function generateReportFromInput(input: string): GeneratedReport {
  const theme = inferTheme(input);
  const segments = splitSegments(input);
  const tomorrowItems = segments.filter((segment) => /明天|明日|下周|待|要|计划/.test(segment));
  const completedItems = segments.filter((segment) => !tomorrowItems.includes(segment));

  const completedText =
    completedItems.length > 0
      ? `今日完成：${completedItems.map((item) => `已推进${item.replace(/今天/, "")}`).join("；")}。`
      : "今日完成：已完成日常内容推进与协同跟进。";
  const tomorrowText =
    tomorrowItems.length > 0
      ? `明日计划：${tomorrowItems.map((item) => item.replace(/明天|明日/g, "").trim()).join("；")}。`
      : "明日计划：继续推进排期执行、对货协调和内容复盘。";

  const dailyReport = `${completedText}\n${tomorrowText}`;
  const weeklyDraft =
    `本周围绕${theme}持续推进内容选题、执行协同与结果复盘，` +
    `${completedItems.length > 0 ? `已完成${completedItems.length}项关键动作，` : ""}` +
    `${tomorrowItems.length > 0 ? `下一步重点为${tomorrowItems.join("、")}。` : "下一步重点放在直播预热和内容转化。"}`
      .replace(/明天|明日/g, "");

  const emailSubject = `【日报】${theme}工作推进情况`;
  const emailBody = `${completedText}\n${tomorrowText}\n如需我补充明细，可继续同步。`;
  const markdown = `# 日报\n\n${dailyReport}\n\n# 周报草稿\n\n${weeklyDraft}\n\n# 邮件模板\n\n主题：${emailSubject}\n\n${emailBody}`;
  const text = `日报\n${dailyReport}\n\n周报草稿\n${weeklyDraft}\n\n邮件主题：${emailSubject}\n\n${emailBody}`;

  return {
    dailyReport,
    weeklyDraft,
    emailSubject,
    emailBody,
    markdown,
    text,
  };
}

export function generateContentSuggestion(topic: string): ContentSuggestion {
  const cleanedTopic = topic.trim() || "通勤穿搭";
  const audience = /面试/.test(cleanedTopic)
    ? "面试女生"
    : /毕业/.test(cleanedTopic)
      ? "毕业季新人"
      : "通勤女生";

  return {
    topic: cleanedTopic,
    titles: [
      `${cleanedTopic}别只说开播了，这样写预告更容易点进来`,
      `${audience}今晚最该看的 3 个${cleanedTopic}看点`,
      `如果要做${cleanedTopic}，开头钩子可以直接这样说`,
    ],
    hook: `先用一句用户最常见的纠结开场，比如“${audience}最怕${cleanedTopic}看起来太用力？”`,
    sellingPoints: [
      "先给明确场景，让用户知道为什么现在要看。",
      "中段直接拆穿搭公式或直播看点，不要空喊福利。",
      "结尾给评论互动口令，方便拉高互动和二次跟进。",
    ],
    cta: `结尾引导可以用：“评论区打‘${cleanedTopic.slice(0, 2)}’，我把搭配重点继续展开。”`,
  };
}

export function timestampedFilename(prefix: string, extension: string) {
  return `${prefix}-${format(new Date(), "yyyyMMdd-HHmm")}.${extension}`;
}
