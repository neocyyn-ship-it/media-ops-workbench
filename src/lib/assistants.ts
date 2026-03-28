import { addDays, format, getDay, startOfDay } from "date-fns";

import { getDefaultCalendarLabel } from "@/lib/calendar";
import type {
  CalendarLabel,
  ContentPlanSuggestion,
  ContentSuggestion,
  ContentStatus,
  ContentType,
  ContentWorkflowStage,
  GeneratedReport,
  HotTopicSuggestion,
  TaskPriority,
  TaskSuggestion,
  TaskType,
  TopicType,
} from "@/lib/types";
import {
  buildWorkingDateTime,
  WORK_END_HOUR,
  WORK_END_MINUTE,
  WORK_START_HOUR,
  WORK_START_MINUTE,
} from "@/lib/work-schedule";

type TemporalContext = {
  dayOffset?: number;
  timeMinutes?: number | null;
};

type ParsedActionSegment = {
  raw: string;
  dueAt: string | null;
  context: TemporalContext;
};

const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

const ACTION_CUE_PATTERN =
  /(对货|库存|盘货|补货|直播|主播|搭配|拍摄|补拍|脚本|文案|标题|封面|预告|图文|视频|复盘|数据|整理|确认|跟进|发布|上新|选题|剪辑|理货|约拍|口播|镜头|素材)/;
const CONNECTOR_PATTERN =
  /^(然后|接着|随后|最后|另外|顺便|还要|还得|并且|再|先|去|做|把)/;
const INTERNAL_TIME_MARKER_PATTERN =
  /(今天|明天|后天|今晚|明早|明晚|下周[一二三四五六日天]?|本周[一二三四五六日天]?|周[一二三四五六日天]|星期[一二三四五六日天]|早上|上午|中午|下午|晚上|\d{1,2}(?:[:：.]?\d{0,2})?(?:点|时)?(?:半)?)/g;

function normalizeText(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/[；;]/g, "。")
    .replace(/[，,]/g, "，")
    .replace(/\s+/g, " ")
    .trim();
}

function insertImplicitBoundaries(input: string) {
  return input
    .replace(
      /(?<=[^。\n])(?=(然后|接着|随后|最后|另外|顺便|还要|还得|并且))/g,
      "。",
    )
    .replace(
      /(?<=[^。\n])(?=(去|做|把|确认|跟进|整理|拍摄|约拍|剪辑|理货|选题|直播|对货|复盘))/g,
      "。",
    );
}

function cleanLeadingConnector(text: string) {
  return text.replace(CONNECTOR_PATTERN, "").trim();
}

function isExplicitDayMarker(marker: string) {
  return /^(今天|明天|后天|今晚|明早|明晚|下周|本周|周|星期)/.test(marker);
}

function isTimeOnlyMarker(marker: string) {
  return /^(早上|上午|中午|下午|晚上|\d{1,2})/.test(marker);
}

function shouldSplitAtMarker(prefix: string, marker: string) {
  const normalizedPrefix = cleanLeadingConnector(prefix.trim());
  if (!normalizedPrefix || normalizedPrefix.length < 2) return false;
  if (!ACTION_CUE_PATTERN.test(normalizedPrefix)) return false;
  if (isExplicitDayMarker(marker)) return normalizedPrefix.length >= 4;
  if (isTimeOnlyMarker(marker)) return normalizedPrefix.length >= 4;
  return false;
}

function splitEmbeddedSegments(segment: string) {
  const parts: string[] = [];
  let cursor = 0;

  for (const match of segment.matchAll(INTERNAL_TIME_MARKER_PATTERN)) {
    const index = match.index ?? 0;
    if (index <= cursor) continue;

    const marker = match[0];
    const prefix = segment.slice(cursor, index);
    if (!shouldSplitAtMarker(prefix, marker)) continue;

    parts.push(segment.slice(cursor, index).trim());
    cursor = index;
  }

  parts.push(segment.slice(cursor).trim());
  return parts.filter(Boolean);
}

function splitSegments(input: string) {
  return insertImplicitBoundaries(normalizeText(input))
    .split(/[。\n]/)
    .flatMap((segment) => splitEmbeddedSegments(segment.trim()))
    .map((segment) => cleanLeadingConnector(segment))
    .filter(Boolean);
}

function inferTaskType(text: string): TaskType {
  if (/摄影|拍摄|补拍|出镜|素材/.test(text)) return "SHOOTING";
  if (/对货|库存|盘货|理货|到样|到货/.test(text)) return "STOCK";
  if (/直播|主播|口播/.test(text)) return "LIVE";
  if (/学习|拆解|模板/.test(text)) return "LEARNING";
  if (/数据|复盘|成交|停留|转化/.test(text)) return "DATA";
  if (/竞品|同行|账号/.test(text)) return "COMPETITOR";
  if (/热点|热词|选题池|趋势/.test(text)) return "HOTTOPIC";
  return "CONTENT";
}

function inferTaskPriority(text: string): TaskPriority {
  if (/必须|立刻|今晚|今天|确认|紧急/.test(text)) return "CRITICAL";
  if (/明天|下午|晚上|约拍|拍摄|交给剪辑/.test(text)) return "HIGH";
  if (/整理|复盘|补充|理货/.test(text)) return "MEDIUM";
  return "MEDIUM";
}

function getOffsetToWeekday(targetWeekday: number, now: Date, forceNextWeek = false) {
  const currentWeekday = getDay(now);
  let offset = targetWeekday - currentWeekday;

  if (offset < 0) offset += 7;
  if (forceNextWeek || offset === 0) offset += 7;

  return offset;
}

function resolveExplicitDayOffset(text: string, now: Date) {
  if (/后天/.test(text)) return 2;
  if (/明天|明早|明晚/.test(text)) return 1;
  if (/今天|今晚/.test(text)) return 0;

  const nextWeekdayMatch = text.match(/下周([一二三四五六日天])/);
  if (nextWeekdayMatch) {
    return getOffsetToWeekday(WEEKDAY_MAP[nextWeekdayMatch[1]], now, true);
  }

  const weekMatch = text.match(/(?:本周|周|星期)([一二三四五六日天])/);
  if (weekMatch) {
    return getOffsetToWeekday(WEEKDAY_MAP[weekMatch[1]], now);
  }

  if (/下周/.test(text)) return 7;
  if (/本周/.test(text)) return 0;

  return null;
}

function clampMinutes(minutes: number) {
  const minMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE;
  const maxMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE;
  return Math.max(minMinutes, Math.min(maxMinutes, minutes));
}

function getNextFollowUpMinutes(previous?: TemporalContext | null) {
  if (previous?.timeMinutes == null) return null;
  return clampMinutes(previous.timeMinutes + 90);
}

function resolveExactTimeMinutes(text: string) {
  const timeMatch = text.match(/(\d{1,2})(?:[:：.](\d{1,2})|点|时)?(半)?/);
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[3] ? 30 : timeMatch[2] ? Number(timeMatch[2]) : 0;

  if (/下午|晚上|今晚|明晚/.test(text) && hour < 12) hour += 12;
  if (/中午/.test(text) && hour < 11) hour += 12;

  return clampMinutes(hour * 60 + minute);
}

function inferDefaultTimeMinutes(text: string, previous?: TemporalContext | null) {
  const exactTime = resolveExactTimeMinutes(text);
  if (exactTime != null) return exactTime;

  if (/早上|上午|明早/.test(text)) return 10 * 60;
  if (/中午/.test(text)) return 12 * 60;
  if (/下午/.test(text)) return 15 * 60;
  if (/晚上|今晚|明晚/.test(text)) return 18 * 60;

  const followUpTime = getNextFollowUpMinutes(previous);
  if (followUpTime != null) return followUpTime;

  if (/发布|发出|上线|上架/.test(text)) return 15 * 60;
  if (/直播|主播|搭配|拍摄|约拍/.test(text)) return 15 * 60;
  if (/脚本|文案|标题|封面|对货|库存|整理|确认|复盘/.test(text)) return 10 * 60;

  return null;
}

function resolveDueAt(text: string, previous?: TemporalContext | null) {
  const now = new Date();
  const explicitDayOffset = resolveExplicitDayOffset(text, now);
  const resolvedDayOffset = explicitDayOffset ?? previous?.dayOffset;
  const resolvedTimeMinutes = inferDefaultTimeMinutes(text, previous);

  if (resolvedDayOffset == null && resolvedTimeMinutes == null) {
    return {
      dueAt: null,
      context: previous ?? {},
    };
  }

  const baseDate = addDays(startOfDay(now), resolvedDayOffset ?? 0);
  const targetMinutes =
    resolvedTimeMinutes ??
    (previous?.timeMinutes != null ? previous.timeMinutes : 10 * 60);

  return {
    dueAt: buildWorkingDateTime(baseDate, {
      hour: Math.floor(targetMinutes / 60),
      minute: targetMinutes % 60,
      direction: "forward",
    }).toISOString(),
    context: {
      dayOffset: resolvedDayOffset ?? 0,
      timeMinutes: targetMinutes,
    },
  };
}

function parseActionSegments(input: string): ParsedActionSegment[] {
  let previousContext: TemporalContext | null = null;

  return splitSegments(input).map((segment) => {
    const { dueAt, context } = resolveDueAt(segment, previousContext);
    previousContext = context;

    return {
      raw: segment,
      dueAt,
      context,
    };
  });
}

function cleanTaskTitle(segment: string) {
  let cleaned = segment.trim();

  const removablePatterns = [
    /^(今天|今晚|明天|后天|下周[一二三四五六日天]?|本周[一二三四五六日天]?|周[一二三四五六日天]|星期[一二三四五六日天]|明早|明晚|早上|上午|中午|下午|晚上)/,
    /^(?:\d{1,2}(?:[:：.]\d{1,2}|点|时)?(?:半)?)/,
    /^(先|然后|接着|最后|顺便|另外|还要|还得|需要|安排|准备|去|做|把)/,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of removablePatterns) {
      const next = cleaned.replace(pattern, "").trim();
      if (next !== cleaned) {
        cleaned = next;
        changed = true;
      }
    }
  }

  return cleaned;
}

export function suggestTasksFromText(input: string): TaskSuggestion[] {
  return parseActionSegments(input).map(({ raw, dueAt }) => {
    const title = cleanTaskTitle(raw) || raw;
    const inferredPriority = inferTaskPriority(raw);
    return {
      title,
      type: inferTaskType(raw),
      priority: dueAt && inferredPriority === "MEDIUM" ? "HIGH" : inferredPriority,
      dueAt,
      notes: `由快速输入自动拆解：${raw}`,
    };
  });
}

function isContentPlanningSegment(text: string) {
  return /(预告|脚本|图文|短视频|视频|笔记|直播|穿搭|种草|选题|发布|上新|封面|标题|拍摄|剪辑)/.test(
    text,
  );
}

function inferContentType(text: string): ContentType {
  if (/图文|笔记/.test(text)) return "CAROUSEL";
  if (/短视频|口播|视频/.test(text)) return "SHORT_VIDEO";
  if (/穿搭|look|搭配/.test(text)) return "OUTFIT";
  if (/种草|卖点|款式/.test(text)) return "SEEDING";
  return "LIVE_TRAILER";
}

function inferContentStatus(text: string): ContentStatus {
  if (/复盘|数据/.test(text)) return "REVIEWED";
  if (/发布|发出|上线|上架/.test(text)) return "SCHEDULED";
  if (/剪辑|剪片|剪出/.test(text)) return "EDITING";
  if (/拍摄|补拍/.test(text)) return "SHOOTING";
  if (/脚本|提纲|文案|标题|封面/.test(text)) return "SCRIPTING";
  return "IDEA";
}

function inferWorkflowStage(text: string): ContentWorkflowStage {
  if (/上线|发布|发出|复盘|数据/.test(text)) return "DONE";
  if (/剪辑|剪片|剪出|给剪辑/.test(text)) return "EDIT";
  if (/素材|整理素材|选片/.test(text)) return "ASSETS";
  if (/拍摄结束|已拍|补拍完成/.test(text)) return "SHOT";
  if (/约拍|排期|摄影|时间/.test(text)) return "BOOKING";
  if (/脚本|口播|镜头|文案|标题|封面/.test(text)) return "SCRIPT";
  if (/理货|盘货|到样|库存|到货/.test(text)) return "INVENTORY";
  if (/商务|选品|对接|主播/.test(text)) return "BUSINESS";
  return "TOPIC";
}

function inferAudience(text: string) {
  if (/面试/.test(text)) return "面试女生";
  if (/通勤/.test(text)) return "通勤女生";
  if (/直播/.test(text)) return "直播间新客";
  if (/小个子/.test(text)) return "小个子女生";
  return "待补充";
}

function inferScenario(text: string) {
  if (/节前|预热|假期前/.test(text)) return "节前预热";
  if (/节后|回流/.test(text)) return "节后回流";
  if (/直播/.test(text)) return "直播运营";
  if (/今天/.test(text)) return "今日执行";
  if (/明天/.test(text)) return "明日准备";
  return "待补充";
}

function cleanContentTitle(segment: string) {
  const cleaned = cleanTaskTitle(segment).replace(/(一条|一篇|一个|一组)$/, "").trim();
  return cleaned || segment.trim();
}

function inferContentDataNote(text: string) {
  if (/预热/.test(text)) return "关注直播开播前点击率和预约转化";
  if (/发布/.test(text)) return "关注发布时间和互动峰值";
  if (/复盘|数据/.test(text)) return "补充停留、点击、成交和评论反馈";
  return null;
}

function buildContentSuggestion(segment: string, dueAt: string | null): ContentPlanSuggestion {
  const contentType = inferContentType(segment);
  const status = inferContentStatus(segment);
  const calendarLabel: CalendarLabel = getDefaultCalendarLabel(status, contentType);

  return {
    title: cleanContentTitle(segment),
    contentType,
    audience: inferAudience(segment),
    scenario: inferScenario(segment),
    product: "待补充",
    script: /脚本|文案|标题|封面/.test(segment) ? segment.trim() : "待补充",
    publishAt: dueAt,
    status,
    workflowStage: inferWorkflowStage(segment),
    calendarLabel,
    dataNote: inferContentDataNote(segment),
    selectionNotes: /选品|主播/.test(segment) ? segment.trim() : null,
    businessNotes: /商务|对接/.test(segment) ? segment.trim() : null,
    inventoryNotes: /理货|盘货|库存|到样|到货/.test(segment) ? segment.trim() : null,
    shootDate: /约拍|拍摄|摄影/.test(segment) ? dueAt : null,
    stylingNotes: /穿搭|look|搭配/.test(segment) ? segment.trim() : null,
    cameraNotes: /镜头/.test(segment) ? segment.trim() : null,
    voiceoverNotes: /口播|语音/.test(segment) ? segment.trim() : null,
    assetNotes: /素材|选片/.test(segment) ? segment.trim() : null,
    editBrief: /剪辑|剪片/.test(segment) ? segment.trim() : null,
  };
}

export function suggestContentPlansFromText(input: string): ContentPlanSuggestion[] {
  return parseActionSegments(input)
    .filter(({ raw }) => isContentPlanningSegment(raw))
    .map(({ raw, dueAt }) => buildContentSuggestion(raw, dueAt));
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
  const tomorrowItems = segments.filter((segment) => /明天|明日|下周|计划/.test(segment));
  const completedItems = segments.filter((segment) => !tomorrowItems.includes(segment));

  const completedText =
    completedItems.length > 0
      ? `今日完成：${completedItems.map((item) => `已推进 ${item.replace(/今天/, "")}`).join("；")}。`
      : "今日完成：已完成日常内容推进与协同跟进。";
  const tomorrowText =
    tomorrowItems.length > 0
      ? `明日计划：${tomorrowItems.map((item) => item.replace(/明天|明日/g, "").trim()).join("；")}。`
      : "明日计划：继续推进排期执行、对货协调和内容复盘。";

  const dailyReport = `${completedText}\n${tomorrowText}`;
  const weeklyDraft =
    `本周围绕${theme}持续推进内容选题、执行协同与结果复盘，` +
    `${completedItems.length > 0 ? `已完成 ${completedItems.length} 项关键动作，` : ""}` +
    `${tomorrowItems.length > 0 ? `下一步重点为 ${tomorrowItems.join("、")}。` : "下一步重点放在直播预热和内容转化。"}`
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

function inferRadarTopicType(text: string): TopicType {
  if (/通勤|面试|直播间|节前|节后|穿搭场景/.test(text)) return "SCENE";
  if (/松弛感|精致感|显瘦|氛围感|情绪/.test(text)) return "EMOTION";
  if (/小个子|梨形|学生|毕业生|上班族|新客|女生/.test(text)) return "AUDIENCE";
  return "TREND";
}

function inferRadarContentType(text: string): ContentType {
  if (/图文|清单|合集/.test(text)) return "CAROUSEL";
  if (/口播|短视频|视频/.test(text)) return "SHORT_VIDEO";
  if (/穿搭|look|搭配/.test(text)) return "OUTFIT";
  if (/直播|预告/.test(text)) return "LIVE_TRAILER";
  return "SEEDING";
}

function cleanTopicLine(line: string) {
  return line
    .replace(/^[\s\-*•·]+/, "")
    .replace(/^\d+[.)、]\s*/, "")
    .replace(/^(Top|TOP)\s*\d+\s*/i, "")
    .trim();
}

function splitTopicLines(input: string) {
  return normalizeText(input)
    .split(/\n|。|；|;/)
    .map(cleanTopicLine)
    .filter((line) => line.length >= 2 && line.length <= 40);
}

function inferTopicDirection(keyword: string) {
  if (/面试/.test(keyword)) return "适合转成面试穿搭直播预告、避雷图文和口播脚本。";
  if (/通勤/.test(keyword)) return "适合转成通勤 look 拍摄脚本和短视频标题。";
  if (/直播/.test(keyword)) return "适合直接做直播预告和直播间口播重点。";
  if (/小个子|梨形|显瘦/.test(keyword)) return "适合做身材问题切口的脚本和剪辑提纲。";
  return "适合先进入选题池，再拆成图文、短视频或直播预告。";
}

function inferTopicContentTitle(keyword: string) {
  if (/直播/.test(keyword)) return `${keyword}的预告选题`;
  if (/面试|通勤/.test(keyword)) return `${keyword}怎么拍成可执行内容`;
  return `${keyword}切成一条可拍的内容选题`;
}

function inferHeatScore(keyword: string, index: number) {
  let score = 60 - index * 3;
  if (/直播|面试|通勤|毕业/.test(keyword)) score += 15;
  if (/显瘦|小个子|梨形|松弛感/.test(keyword)) score += 10;
  return Math.max(35, Math.min(score, 95));
}

export function suggestHotTopicsFromText(
  input: string,
  sourceHint = "AI 热点雷达",
): HotTopicSuggestion[] {
  const keywords = [...new Set(splitTopicLines(input))].slice(0, 10);

  return keywords.map((keyword, index) => ({
    keyword,
    type: inferRadarTopicType(keyword),
    source: sourceHint || "AI 热点雷达",
    usableDirection: inferTopicDirection(keyword),
    contentTitle: inferTopicContentTitle(keyword),
    contentType: inferRadarContentType(keyword),
    workflowStage: "TOPIC",
    heatScore: inferHeatScore(keyword, index),
  }));
}

export function generateContentSuggestion(topic: string): ContentSuggestion {
  const cleanedTopic = topic.trim() || "通勤穿搭";
  const audience = /面试/.test(cleanedTopic)
    ? "面试女生"
    : /毕业/.test(cleanedTopic)
      ? "毕业季新人"
      : /小个子/.test(cleanedTopic)
        ? "小个子女生"
        : "通勤女生";

  return {
    topic: cleanedTopic,
    titles: [
      `${cleanedTopic}别只说开播了，这样写预告更容易点进来`,
      `${audience}今晚最该看的 3 个 ${cleanedTopic}看点`,
      `如果要做 ${cleanedTopic}，开头钩子可以直接这样说`,
    ],
    hook: `先用一句用户最常见的纠结开场，比如“${audience}做 ${cleanedTopic} 时最怕看起来太用力怎么办？”`,
    sellingPoints: [
      "先给明确场景，让用户知道为什么现在要看。",
      "中段直接拆穿搭公式或直播看点，不要空喊福利。",
      "结尾给评论互动口令，方便拉高互动和二次跟进。",
    ],
    cta: `结尾引导可以用：“评论区打‘${cleanedTopic.slice(0, 2)}’，我把搭配重点继续展开。”`,
    stylingNotes: [
      "先定 3 套主推 look，每套都对应一个真实场景。",
      "把颜色、版型、鞋包顺序写死，避免现场临时改。",
      "主推款、替代款、尺码提醒都要提前放进脚本。",
    ],
    shotSequence: [
      "镜头 1：3 秒痛点开场，先说用户最怕踩的坑。",
      "镜头 2：上身前后对比，给出第一套 look 的核心卖点。",
      "镜头 3：切第二、第三套 look，补充细节镜头和动作镜头。",
      "镜头 4：结尾做评论引导和直播间承接。",
    ],
    voiceoverLines: [
      `这套 ${cleanedTopic} 不是单纯好看，是上镜和日常都能穿。`,
      "如果你担心显胖、显学生气或者不够精神，这里直接帮你避掉。",
      "我会把每套 look 的搭配重点和替换方案都讲清楚。",
    ],
    editFlow: [
      "前 2 秒先给结果或对比，保证用户停留。",
      "中间节奏按“问题-解决-细节”剪，不要把动作镜头全堆一起。",
      "字幕重点放版型、场景、适合人群和评论区口令。",
    ],
  };
}

export function timestampedFilename(prefix: string, extension: string) {
  return `${prefix}-${format(new Date(), "yyyyMMdd-HHmm")}.${extension}`;
}
