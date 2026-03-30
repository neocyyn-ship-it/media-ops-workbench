export const TASK_TYPES = [
  "CONTENT",
  "SHOOTING",
  "STOCK",
  "LIVE",
  "LEARNING",
  "DATA",
  "COMPETITOR",
  "HOTTOPIC",
] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const TASK_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
] as const;
export const TASK_CADENCES = ["ONE_OFF", "DAILY", "WEEKLY"] as const;
export const WORKSPACE_PROGRESS = [
  "FOCUSED",
  "ON_TRACK",
  "STRETCHED",
  "BLOCKED",
  "COMPLETE",
] as const;
export const CONTENT_TYPES = [
  "LIVE_TRAILER",
  "OUTFIT",
  "SEEDING",
  "CAROUSEL",
  "SHORT_VIDEO",
] as const;
export const CONTENT_STATUSES = [
  "IDEA",
  "SCRIPTING",
  "SHOOTING",
  "EDITING",
  "SCHEDULED",
  "PUBLISHED",
  "REVIEWED",
] as const;
export const CONTENT_WORKFLOW_STAGES = [
  "TOPIC",
  "BUSINESS",
  "INVENTORY",
  "SCRIPT",
  "BOOKING",
  "SHOT",
  "ASSETS",
  "EDIT",
  "DONE",
] as const;
export const CALENDAR_LABELS = [
  "CAMPAIGN",
  "PRODUCTION",
  "PUBLISH",
  "REVIEW",
  "IDEA_POOL",
  "FOLLOW_UP",
] as const;
export const INSPIRATION_TYPES = [
  "COVER",
  "TITLE",
  "COPY",
  "VIDEO_STRUCTURE",
  "COMMENTS",
  "AUDIO",
] as const;
export const PLATFORMS = [
  "XIAOHONGSHU",
  "DOUYIN",
  "TAOBAO_LIVE",
  "WECHAT_VIDEO",
] as const;
export const TOPIC_TYPES = ["SCENE", "EMOTION", "AUDIENCE", "TREND"] as const;
export const WEEKLY_ENGAGEMENT_TYPES = [
  "MEETING",
  "SHOOTING",
  "LIVE",
  "STOCK",
  "TRANSFER",
  "OTHER",
] as const;
export const WEEKLY_ENGAGEMENT_ROLES = [
  "PHOTOGRAPHER",
  "HOST",
  "BRAND",
  "COLLEAGUE",
  "MODEL",
  "OTHER",
] as const;
export const WEEKLY_ENGAGEMENT_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;

export type TaskType = (typeof TASK_TYPES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskCadence = (typeof TASK_CADENCES)[number];
export type WorkspaceProgress = (typeof WORKSPACE_PROGRESS)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ContentWorkflowStage = (typeof CONTENT_WORKFLOW_STAGES)[number];
export type CalendarLabel = (typeof CALENDAR_LABELS)[number];
export type InspirationType = (typeof INSPIRATION_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type TopicType = (typeof TOPIC_TYPES)[number];
export type WeeklyEngagementType = (typeof WEEKLY_ENGAGEMENT_TYPES)[number];
export type WeeklyEngagementRole = (typeof WEEKLY_ENGAGEMENT_ROLES)[number];
export type WeeklyEngagementStatus = (typeof WEEKLY_ENGAGEMENT_STATUSES)[number];

export type TaskView = "today" | "week" | "all";
export type TopicWindow = "today" | "week" | "all";
export type PlannerView = "month" | "week" | "day";
export type HolidayMarkerType = "holiday" | "weekend";

export interface TaskRecord {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  dueAt: string | null;
  owner: string | null;
  status: TaskStatus;
  notes: string | null;
  cadence: TaskCadence;
  isTodayFocus: boolean;
  sourceText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDayRecord {
  dateKey: string;
  date: string;
  progressStatus: WorkspaceProgress;
  morningFocus: string | null;
  reviewText: string | null;
  tomorrowPlan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlanRecord {
  id: string;
  title: string;
  contentType: ContentType;
  audience: string;
  scenario: string;
  product: string;
  script: string;
  publishAt: string | null;
  status: ContentStatus;
  workflowStage: ContentWorkflowStage;
  calendarLabel: CalendarLabel | null;
  dataNote: string | null;
  selectionNotes: string | null;
  businessNotes: string | null;
  inventoryNotes: string | null;
  shootDate: string | null;
  stylingNotes: string | null;
  cameraNotes: string | null;
  voiceoverNotes: string | null;
  assetNotes: string | null;
  editBrief: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspirationRecord {
  id: string;
  link: string | null;
  screenshot: string | null;
  sourceAccount: string;
  type: InspirationType;
  hookSummary: string;
  reusableIdea: string;
  tags: string;
  capturedAt: string;
  createdAt: string;
}

export interface CompetitorRecord {
  id: string;
  accountName: string;
  platform: Platform;
  contentLink: string | null;
  contentTopic: string;
  hookPoint: string;
  commentInsight: string;
  takeaway: string;
  observedAt: string;
  createdAt: string;
}

export interface HotTopicRecord {
  id: string;
  keyword: string;
  type: TopicType;
  source: string;
  happenedAt: string;
  usableDirection: string;
  createdAt: string;
}

export interface ReportDraftRecord {
  id: string;
  rawInput: string;
  dailyReport: string;
  weeklyDraft: string;
  emailSubject: string;
  emailBody: string;
  createdAt: string;
}

export interface WeeklyEngagementRecord {
  id: string;
  title: string;
  type: WeeklyEngagementType;
  date: string;
  time: string | null;
  contactName: string;
  contactRole: WeeklyEngagementRole;
  note: string | null;
  referenceLinks: string[];
  status: WeeklyEngagementStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSnapshot {
  focusTasks: TaskRecord[];
  todayTasks: TaskRecord[];
  counts: {
    total: number;
    completed: number;
    waiting: number;
    overdue: number;
  };
  weeklyEngagements: WeeklyEngagementRecord[];
  workspaceDay: WorkspaceDayRecord;
  latestReport: ReportDraftRecord | null;
}

export interface TaskSuggestion {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  dueAt: string | null;
  owner?: string | null;
  notes?: string | null;
}

export interface GeneratedReport {
  dailyReport: string;
  weeklyDraft: string;
  emailSubject: string;
  emailBody: string;
  markdown: string;
  text: string;
}

export interface ContentSuggestion {
  topic: string;
  titles: string[];
  hook: string;
  sellingPoints: string[];
  cta: string;
  stylingNotes: string[];
  shotSequence: string[];
  voiceoverLines: string[];
  editFlow: string[];
}

export interface ContentPlanSuggestion {
  title: string;
  contentType: ContentType;
  audience?: string;
  scenario?: string;
  product?: string;
  script?: string;
  publishAt: string | null;
  status: ContentStatus;
  workflowStage: ContentWorkflowStage;
  calendarLabel: CalendarLabel | null;
  dataNote?: string | null;
  selectionNotes?: string | null;
  businessNotes?: string | null;
  inventoryNotes?: string | null;
  shootDate?: string | null;
  stylingNotes?: string | null;
  cameraNotes?: string | null;
  voiceoverNotes?: string | null;
  assetNotes?: string | null;
  editBrief?: string | null;
}

export interface HotTopicSuggestion {
  keyword: string;
  type: TopicType;
  source: string;
  usableDirection: string;
  contentTitle: string;
  contentType: ContentType;
  workflowStage: ContentWorkflowStage;
  heatScore: number;
}

export interface HolidayMarker {
  dateKey: string;
  name: string;
  type: HolidayMarkerType;
}
