import type {
  CalendarLabel,
  ContentStatus,
  ContentType,
  ContentWorkflowStage,
  InspirationType,
  Platform,
  TaskCadence,
  TaskPriority,
  TaskStatus,
  TaskType,
  TopicType,
  WeeklyEngagementRole,
  WeeklyEngagementStatus,
  WeeklyEngagementType,
  WorkspaceProgress,
} from "@/lib/types";
import {
  CALENDAR_LABELS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  CONTENT_WORKFLOW_STAGES,
  INSPIRATION_TYPES,
  PLATFORMS,
  TASK_CADENCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  TOPIC_TYPES,
  WEEKLY_ENGAGEMENT_ROLES,
  WEEKLY_ENGAGEMENT_STATUSES,
  WEEKLY_ENGAGEMENT_TYPES,
  WORKSPACE_PROGRESS,
} from "@/lib/types";

type Option<T extends string> = { value: T; label: string };

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CONTENT: "鍐呭",
  SHOOTING: "鎷嶆憚",
  STOCK: "瀵硅揣",
  LIVE: "鐩存挱",
  LEARNING: "瀛︿範",
  DATA: "鏁版嵁",
  COMPETITOR: "绔炲搧",
  HOTTOPIC: "鐑偣",
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
  ONE_OFF: "鍗曟",
  DAILY: "姣忔棩鍥哄畾",
  WEEKLY: "姣忓懆鍥哄畾",
};

export const WORKSPACE_PROGRESS_LABELS: Record<WorkspaceProgress, string> = {
  FOCUSED: "楂樻晥鎺ㄨ繘",
  ON_TRACK: "姝ｅ父鎺ㄨ繘",
  STRETCHED: "鏈夌偣璧?",
  BLOCKED: "鏈夐樆濉?",
  COMPLETE: "浠婃棩鏀跺伐",
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  LIVE_TRAILER: "鐩存挱棰勫憡",
  OUTFIT: "绌挎惌",
  SEEDING: "绉嶈崏",
  CAROUSEL: "鍥炬枃",
  SHORT_VIDEO: "鐭棰?",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: "寰呴€夐",
  SCRIPTING: "鍐欒剼鏈?",
  SHOOTING: "鎷嶆憚涓?",
  EDITING: "鍓緫涓?",
  SCHEDULED: "宸叉帓鏈?",
  PUBLISHED: "宸插彂甯?",
  REVIEWED: "宸插鐩?",
};

export const CONTENT_WORKFLOW_STAGE_LABELS: Record<ContentWorkflowStage, string> = {
  TOPIC: "閫夐閿佸畾",
  BUSINESS: "閫夊搧鍟嗗姟",
  INVENTORY: "鍒版牱鐞嗚揣",
  SCRIPT: "鎷嶆憚鑴氭湰",
  BOOKING: "绾︽媿纭",
  SHOT: "宸叉媿寰呮暣",
  ASSETS: "绱犳潗鏁寸悊",
  EDIT: "浜や粯鍓緫",
  DONE: "涓婄嚎澶嶇洏",
};

export const CALENDAR_LABEL_LABELS: Record<CalendarLabel, string> = {
  CAMPAIGN: "鐩存挱棰勭儹",
  PRODUCTION: "鎷嶆憚鍒朵綔",
  PUBLISH: "姝ｅ紡鍙戝竷",
  REVIEW: "鏁版嵁澶嶇洏",
  IDEA_POOL: "閫夐鍌ㄥ",
  FOLLOW_UP: "鍗忓悓璺熻繘",
};

export const CALENDAR_LABEL_DESCRIPTIONS: Record<CalendarLabel, string> = {
  CAMPAIGN: "棰勫憡銆佺洿鎾€佹椿鍔ㄨ妭鐐?",
  PRODUCTION: "鑴氭湰銆佹媿鎽勩€佸壀杈戞墽琛屼腑",
  PUBLISH: "鎺掓湡宸插畾锛屽噯澶囧彂甯冩垨宸插彂甯?",
  REVIEW: "澶嶇洏銆佹暟鎹洖濉拰浜屾浼樺寲",
  IDEA_POOL: "鐏垫劅銆佸緟鎺掓湡閫夐鍜岄澶囧潙浣?",
  FOLLOW_UP: "绛変汉鍗忎綔銆佸璐с€佽ˉ浣嶆彁閱?",
};

export const INSPIRATION_TYPE_LABELS: Record<InspirationType, string> = {
  COVER: "灏侀潰",
  TITLE: "鏍囬",
  COPY: "鏂囨",
  VIDEO_STRUCTURE: "瑙嗛缁撴瀯",
  COMMENTS: "璇勮鍖?",
  AUDIO: "闊虫晥",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  XIAOHONGSHU: "灏忕孩涔?",
  DOUYIN: "鎶栭煶",
  TAOBAO_LIVE: "娣樺疂鐩存挱",
  WECHAT_VIDEO: "寰俊瑙嗛鍙?",
};

export const TOPIC_TYPE_LABELS: Record<TopicType, string> = {
  SCENE: "鍦烘櫙璇?",
  EMOTION: "鎯呯华璇?",
  AUDIENCE: "浜虹兢璇?",
  TREND: "鐑偣璇?",
};


export const WEEKLY_ENGAGEMENT_TYPE_LABELS: Record<WeeklyEngagementType, string> = {
  MEETING: "浼氳",
  SHOOTING: "鎷嶆憚",
  LIVE: "鐩存挱",
  STOCK: "瀵硅揣",
  TRANSFER: "璋冭揣",
  OTHER: "鍏跺畠",
};

export const WEEKLY_ENGAGEMENT_ROLE_LABELS: Record<WeeklyEngagementRole, string> = {
  PHOTOGRAPHER: "鎽勫影",
  HOST: "涓绘挱",
  BRAND: "鍝佺墝鏂?",
  COLLEAGUE: "鍚屼簨",
  MODEL: "妯＄壒",
  OTHER: "鍏跺畠",
};

export const WEEKLY_ENGAGEMENT_STATUS_LABELS: Record<WeeklyEngagementStatus, string> = {
  PENDING: "寰呰繘琛?",
  IN_PROGRESS: "杩涜涓?",
  DONE: "宸插畬鎴?",
};

function buildOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): Option<T>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

export const TASK_TYPE_OPTIONS = buildOptions(TASK_TYPES, TASK_TYPE_LABELS);
export const TASK_PRIORITY_OPTIONS = buildOptions(TASK_PRIORITIES, TASK_PRIORITY_LABELS);
export const TASK_STATUS_OPTIONS = buildOptions(TASK_STATUSES, TASK_STATUS_LABELS);
export const TASK_CADENCE_OPTIONS = buildOptions(TASK_CADENCES, TASK_CADENCE_LABELS);
export const WORKSPACE_PROGRESS_OPTIONS = buildOptions(
  WORKSPACE_PROGRESS,
  WORKSPACE_PROGRESS_LABELS,
);
export const CONTENT_TYPE_OPTIONS = buildOptions(CONTENT_TYPES, CONTENT_TYPE_LABELS);
export const CONTENT_STATUS_OPTIONS = buildOptions(CONTENT_STATUSES, CONTENT_STATUS_LABELS);
export const CONTENT_WORKFLOW_STAGE_OPTIONS = buildOptions(
  CONTENT_WORKFLOW_STAGES,
  CONTENT_WORKFLOW_STAGE_LABELS,
);
export const CALENDAR_LABEL_OPTIONS = buildOptions(CALENDAR_LABELS, CALENDAR_LABEL_LABELS);
export const INSPIRATION_TYPE_OPTIONS = buildOptions(
  INSPIRATION_TYPES,
  INSPIRATION_TYPE_LABELS,
);
export const PLATFORM_OPTIONS = buildOptions(PLATFORMS, PLATFORM_LABELS);
export const TOPIC_TYPE_OPTIONS = buildOptions(TOPIC_TYPES, TOPIC_TYPE_LABELS);
export const WEEKLY_ENGAGEMENT_TYPE_OPTIONS = buildOptions(
  WEEKLY_ENGAGEMENT_TYPES,
  WEEKLY_ENGAGEMENT_TYPE_LABELS,
);
export const WEEKLY_ENGAGEMENT_ROLE_OPTIONS = buildOptions(
  WEEKLY_ENGAGEMENT_ROLES,
  WEEKLY_ENGAGEMENT_ROLE_LABELS,
);
export const WEEKLY_ENGAGEMENT_STATUS_OPTIONS = buildOptions(
  WEEKLY_ENGAGEMENT_STATUSES,
  WEEKLY_ENGAGEMENT_STATUS_LABELS,
);

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
