import type {
  ContentStatus,
  ContentType,
  InspirationType,
  Platform,
  TaskCadence,
  TaskPriority,
  TaskStatus,
  TaskType,
  TopicType,
  WorkspaceProgress,
} from "@/lib/types";
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  INSPIRATION_TYPES,
  PLATFORMS,
  TASK_CADENCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  TOPIC_TYPES,
  WORKSPACE_PROGRESS,
} from "@/lib/types";

type Option<T extends string> = { value: T; label: string };

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CONTENT: "内容",
  SHOOTING: "拍摄",
  STOCK: "对货",
  LIVE: "直播",
  LEARNING: "学习",
  DATA: "数据",
  COMPETITOR: "竞品",
  HOTTOPIC: "热点",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "紧急",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  WAITING: "等待他人",
  DONE: "已完成",
};

export const TASK_CADENCE_LABELS: Record<TaskCadence, string> = {
  ONE_OFF: "单次",
  DAILY: "每日固定",
  WEEKLY: "每周固定",
};

export const WORKSPACE_PROGRESS_LABELS: Record<WorkspaceProgress, string> = {
  FOCUSED: "高效推进",
  ON_TRACK: "正常推进",
  STRETCHED: "有点赶",
  BLOCKED: "有阻塞",
  COMPLETE: "今日收工",
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  LIVE_TRAILER: "直播预告",
  OUTFIT: "穿搭",
  SEEDING: "种草",
  CAROUSEL: "图文",
  SHORT_VIDEO: "短视频",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: "待选题",
  SCRIPTING: "写脚本",
  SHOOTING: "拍摄中",
  EDITING: "剪辑中",
  SCHEDULED: "已排期",
  PUBLISHED: "已发布",
  REVIEWED: "已复盘",
};

export const INSPIRATION_TYPE_LABELS: Record<InspirationType, string> = {
  COVER: "封面",
  TITLE: "标题",
  COPY: "文案",
  VIDEO_STRUCTURE: "视频结构",
  COMMENTS: "评论区",
  AUDIO: "音效",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  XIAOHONGSHU: "小红书",
  DOUYIN: "抖音",
  TAOBAO_LIVE: "淘宝直播",
  WECHAT_VIDEO: "微信视频号",
};

export const TOPIC_TYPE_LABELS: Record<TopicType, string> = {
  SCENE: "场景词",
  EMOTION: "情绪词",
  AUDIENCE: "人群词",
  TREND: "热点词",
};

function buildOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): Option<T>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

export const TASK_TYPE_OPTIONS = buildOptions(TASK_TYPES, TASK_TYPE_LABELS);
export const TASK_PRIORITY_OPTIONS = buildOptions(
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
);
export const TASK_STATUS_OPTIONS = buildOptions(TASK_STATUSES, TASK_STATUS_LABELS);
export const TASK_CADENCE_OPTIONS = buildOptions(
  TASK_CADENCES,
  TASK_CADENCE_LABELS,
);
export const WORKSPACE_PROGRESS_OPTIONS = buildOptions(
  WORKSPACE_PROGRESS,
  WORKSPACE_PROGRESS_LABELS,
);
export const CONTENT_TYPE_OPTIONS = buildOptions(
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
);
export const CONTENT_STATUS_OPTIONS = buildOptions(
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
);
export const INSPIRATION_TYPE_OPTIONS = buildOptions(
  INSPIRATION_TYPES,
  INSPIRATION_TYPE_LABELS,
);
export const PLATFORM_OPTIONS = buildOptions(PLATFORMS, PLATFORM_LABELS);
export const TOPIC_TYPE_OPTIONS = buildOptions(TOPIC_TYPES, TOPIC_TYPE_LABELS);

export const NAV_ITEMS = [
  { href: "/", label: "工作台" },
  { href: "/tasks", label: "任务" },
  { href: "/content", label: "排期" },
  { href: "/inspiration", label: "素材库" },
  { href: "/competitors", label: "竞品" },
  { href: "/topics", label: "热点" },
  { href: "/reports", label: "日报" },
] as const;

export function isOneOf<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};
