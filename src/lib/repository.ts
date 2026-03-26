import { randomUUID } from "node:crypto";

import {
  isWithinInterval,
  parseISO,
} from "date-fns";

import { getAppDateFromKey, getAppDateKey, getAppDayInterval, getAppWeekInterval } from "@/lib/app-time";
import { getDb } from "@/lib/database";
import { PRIORITY_RANK } from "@/lib/options";
import type {
  CompetitorRecord,
  ContentPlanRecord,
  DashboardSnapshot,
  HotTopicRecord,
  InspirationRecord,
  ReportDraftRecord,
  TaskCadence,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  TaskType,
  WorkspaceDayRecord,
  WorkspaceProgress,
} from "@/lib/types";

type Row = Record<string, string | number | null>;

const taskBaseSelect = `
  SELECT
    id,
    title,
    type,
    priority,
    due_at AS dueAt,
    owner,
    status,
    notes,
    cadence,
    is_today_focus AS isTodayFocus,
    source_text AS sourceText,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM tasks
`;

const workspaceBaseSelect = `
  SELECT
    date_key AS dateKey,
    date,
    progress_status AS progressStatus,
    morning_focus AS morningFocus,
    review_text AS reviewText,
    tomorrow_plan AS tomorrowPlan,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM workspace_days
`;

const contentBaseSelect = `
  SELECT
    id,
    title,
    content_type AS contentType,
    audience,
    scenario,
    product,
    script,
    publish_at AS publishAt,
    status,
    calendar_label AS calendarLabel,
    data_note AS dataNote,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM content_plans
`;

const inspirationBaseSelect = `
  SELECT
    id,
    link,
    screenshot,
    source_account AS sourceAccount,
    type,
    hook_summary AS hookSummary,
    reusable_idea AS reusableIdea,
    tags,
    captured_at AS capturedAt,
    created_at AS createdAt
  FROM inspiration_items
`;

const competitorBaseSelect = `
  SELECT
    id,
    account_name AS accountName,
    platform,
    content_link AS contentLink,
    content_topic AS contentTopic,
    hook_point AS hookPoint,
    comment_insight AS commentInsight,
    takeaway,
    observed_at AS observedAt,
    created_at AS createdAt
  FROM competitor_observations
`;

const topicBaseSelect = `
  SELECT
    id,
    keyword,
    type,
    source,
    happened_at AS happenedAt,
    usable_direction AS usableDirection,
    created_at AS createdAt
  FROM hot_topics
`;

const reportBaseSelect = `
  SELECT
    id,
    raw_input AS rawInput,
    daily_report AS dailyReport,
    weekly_draft AS weeklyDraft,
    email_subject AS emailSubject,
    email_body AS emailBody,
    created_at AS createdAt
  FROM report_drafts
`;

function mapTask(row: Row): TaskRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    type: row.type as TaskType,
    priority: row.priority as TaskPriority,
    dueAt: row.dueAt ? String(row.dueAt) : null,
    owner: row.owner ? String(row.owner) : null,
    status: row.status as TaskStatus,
    notes: row.notes ? String(row.notes) : null,
    cadence: row.cadence as TaskCadence,
    isTodayFocus: Number(row.isTodayFocus) === 1,
    sourceText: row.sourceText ? String(row.sourceText) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapWorkspaceDay(row: Row): WorkspaceDayRecord {
  return {
    dateKey: String(row.dateKey),
    date: String(row.date),
    progressStatus: row.progressStatus as WorkspaceProgress,
    morningFocus: row.morningFocus ? String(row.morningFocus) : null,
    reviewText: row.reviewText ? String(row.reviewText) : null,
    tomorrowPlan: row.tomorrowPlan ? String(row.tomorrowPlan) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapContentPlan(row: Row): ContentPlanRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    contentType: row.contentType as ContentPlanRecord["contentType"],
    audience: String(row.audience),
    scenario: String(row.scenario),
    product: String(row.product),
    script: String(row.script),
    publishAt: row.publishAt ? String(row.publishAt) : null,
    status: row.status as ContentPlanRecord["status"],
    calendarLabel: row.calendarLabel ? (String(row.calendarLabel) as ContentPlanRecord["calendarLabel"]) : null,
    dataNote: row.dataNote ? String(row.dataNote) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapInspiration(row: Row): InspirationRecord {
  return {
    id: String(row.id),
    link: row.link ? String(row.link) : null,
    screenshot: row.screenshot ? String(row.screenshot) : null,
    sourceAccount: String(row.sourceAccount),
    type: row.type as InspirationRecord["type"],
    hookSummary: String(row.hookSummary),
    reusableIdea: String(row.reusableIdea),
    tags: String(row.tags),
    capturedAt: String(row.capturedAt),
    createdAt: String(row.createdAt),
  };
}

function mapCompetitor(row: Row): CompetitorRecord {
  return {
    id: String(row.id),
    accountName: String(row.accountName),
    platform: row.platform as CompetitorRecord["platform"],
    contentLink: row.contentLink ? String(row.contentLink) : null,
    contentTopic: String(row.contentTopic),
    hookPoint: String(row.hookPoint),
    commentInsight: String(row.commentInsight),
    takeaway: String(row.takeaway),
    observedAt: String(row.observedAt),
    createdAt: String(row.createdAt),
  };
}

function mapHotTopic(row: Row): HotTopicRecord {
  return {
    id: String(row.id),
    keyword: String(row.keyword),
    type: row.type as HotTopicRecord["type"],
    source: String(row.source),
    happenedAt: String(row.happenedAt),
    usableDirection: String(row.usableDirection),
    createdAt: String(row.createdAt),
  };
}

function mapReportDraft(row: Row): ReportDraftRecord {
  return {
    id: String(row.id),
    rawInput: String(row.rawInput),
    dailyReport: String(row.dailyReport),
    weeklyDraft: String(row.weeklyDraft),
    emailSubject: String(row.emailSubject),
    emailBody: String(row.emailBody),
    createdAt: String(row.createdAt),
  };
}

function compareTasks(a: TaskRecord, b: TaskRecord) {
  const priorityGap = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (priorityGap !== 0) return priorityGap;
  if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

export function listTasks() {
  const rows = getDb().prepare(`${taskBaseSelect} ORDER BY updated_at DESC`).all() as Row[];
  return rows.map(mapTask).sort(compareTasks);
}

export function getTaskById(id: string) {
  const row = getDb()
    .prepare(`${taskBaseSelect} WHERE id = ?`)
    .get(id) as Row | undefined;
  return row ? mapTask(row) : null;
}

export function createTask(input: {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  dueAt?: string | null;
  owner?: string | null;
  status?: TaskStatus;
  notes?: string | null;
  cadence?: TaskCadence;
  isTodayFocus?: boolean;
  sourceText?: string | null;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    title: input.title,
    type: input.type,
    priority: input.priority,
    due_at: input.dueAt ?? null,
    owner: input.owner ?? null,
    status: input.status ?? "NOT_STARTED",
    notes: input.notes ?? null,
    cadence: input.cadence ?? "ONE_OFF",
    is_today_focus: input.isTodayFocus ? 1 : 0,
    source_text: input.sourceText ?? null,
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(`
      INSERT INTO tasks (
        id, title, type, priority, due_at, owner, status, notes, cadence,
        is_today_focus, source_text, created_at, updated_at
      ) VALUES (
        @id, @title, @type, @priority, @due_at, @owner, @status, @notes, @cadence,
        @is_today_focus, @source_text, @created_at, @updated_at
      )
    `)
    .run(record);

  return getTaskById(record.id)!;
}

export function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    type: TaskType;
    priority: TaskPriority;
    dueAt: string | null;
    owner: string | null;
    status: TaskStatus;
    notes: string | null;
    cadence: TaskCadence;
    isTodayFocus: boolean;
  }>,
) {
  const updates: Record<string, string | number | null> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.dueAt !== undefined) updates.due_at = patch.dueAt;
  if (patch.owner !== undefined) updates.owner = patch.owner;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.cadence !== undefined) updates.cadence = patch.cadence;
  if (patch.isTodayFocus !== undefined) updates.is_today_focus = patch.isTodayFocus ? 1 : 0;

  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return getTaskById(id);
  }

  updates.updated_at = new Date().toISOString();
  updates.id = id;

  const setClause = fields.map((field) => `${field} = @${field}`).concat("updated_at = @updated_at");
  getDb()
    .prepare(`UPDATE tasks SET ${setClause.join(", ")} WHERE id = @id`)
    .run(updates);

  return getTaskById(id);
}

export function getWorkspaceDay(date = new Date()) {
  const dateKey = getAppDateKey(date);
  let row = getDb()
    .prepare(`${workspaceBaseSelect} WHERE date_key = ?`)
    .get(dateKey) as Row | undefined;

  if (!row) {
    const now = new Date().toISOString();
    const { start } = getAppDayInterval(date);
    getDb()
      .prepare(`
        INSERT INTO workspace_days (
          date_key, date, progress_status, morning_focus, review_text,
          tomorrow_plan, created_at, updated_at
        ) VALUES (
          @date_key, @date, @progress_status, @morning_focus, @review_text,
          @tomorrow_plan, @created_at, @updated_at
        )
      `)
      .run({
        date_key: dateKey,
        date: start.toISOString(),
        progress_status: "ON_TRACK",
        morning_focus: null,
        review_text: null,
        tomorrow_plan: null,
        created_at: now,
        updated_at: now,
      });

    row = getDb()
      .prepare(`${workspaceBaseSelect} WHERE date_key = ?`)
      .get(dateKey) as Row;
  }

  return mapWorkspaceDay(row);
}

export function saveWorkspaceDay(
  dateKey: string,
  patch: Partial<{
    progressStatus: WorkspaceProgress;
    morningFocus: string | null;
    reviewText: string | null;
    tomorrowPlan: string | null;
  }>,
) {
  const existing = getWorkspaceDay(getAppDateFromKey(dateKey));
  const values = {
    progress_status: patch.progressStatus ?? existing.progressStatus,
    morning_focus: patch.morningFocus ?? existing.morningFocus,
    review_text: patch.reviewText ?? existing.reviewText,
    tomorrow_plan: patch.tomorrowPlan ?? existing.tomorrowPlan,
    updated_at: new Date().toISOString(),
    date_key: dateKey,
  };

  getDb()
    .prepare(`
      UPDATE workspace_days
      SET
        progress_status = @progress_status,
        morning_focus = @morning_focus,
        review_text = @review_text,
        tomorrow_plan = @tomorrow_plan,
        updated_at = @updated_at
      WHERE date_key = @date_key
    `)
    .run(values);

  return getWorkspaceDay(getAppDateFromKey(dateKey));
}

export function listContentPlans() {
  const rows = getDb()
    .prepare(`${contentBaseSelect} ORDER BY publish_at ASC, created_at DESC`)
    .all() as Row[];
  return rows.map(mapContentPlan);
}

export function getContentPlanById(id: string) {
  const row = getDb()
    .prepare(`${contentBaseSelect} WHERE id = ?`)
    .get(id) as Row | undefined;
  return row ? mapContentPlan(row) : null;
}

export function createContentPlan(input: {
  title: string;
  contentType: ContentPlanRecord["contentType"];
  audience: string;
  scenario: string;
  product: string;
  script: string;
  publishAt?: string | null;
  status?: ContentPlanRecord["status"];
  calendarLabel?: ContentPlanRecord["calendarLabel"];
  dataNote?: string | null;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    title: input.title,
    content_type: input.contentType,
    audience: input.audience,
    scenario: input.scenario,
    product: input.product,
    script: input.script,
    publish_at: input.publishAt ?? null,
    status: input.status ?? "IDEA",
    calendar_label: input.calendarLabel ?? null,
    data_note: input.dataNote ?? null,
    created_at: now,
    updated_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO content_plans (
        id, title, content_type, audience, scenario, product, script,
        publish_at, status, calendar_label, data_note, created_at, updated_at
      ) VALUES (
        @id, @title, @content_type, @audience, @scenario, @product, @script,
        @publish_at, @status, @calendar_label, @data_note, @created_at, @updated_at
      )
    `)
    .run(record);

  const row = getDb()
    .prepare(`${contentBaseSelect} WHERE id = ?`)
    .get(record.id) as Row;
  return mapContentPlan(row);
}

export function updateContentPlan(
  id: string,
  patch: Partial<{
    title: string;
    contentType: ContentPlanRecord["contentType"];
    audience: string;
    scenario: string;
    product: string;
    script: string;
    publishAt: string | null;
    status: ContentPlanRecord["status"];
    calendarLabel: ContentPlanRecord["calendarLabel"];
    dataNote: string | null;
  }>,
) {
  const updates: Record<string, string | null> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.contentType !== undefined) updates.content_type = patch.contentType;
  if (patch.audience !== undefined) updates.audience = patch.audience;
  if (patch.scenario !== undefined) updates.scenario = patch.scenario;
  if (patch.product !== undefined) updates.product = patch.product;
  if (patch.script !== undefined) updates.script = patch.script;
  if (patch.publishAt !== undefined) updates.publish_at = patch.publishAt;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.calendarLabel !== undefined) updates.calendar_label = patch.calendarLabel;
  if (patch.dataNote !== undefined) updates.data_note = patch.dataNote;

  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return getContentPlanById(id);
  }

  const values = {
    ...updates,
    updated_at: new Date().toISOString(),
    id,
  };

  const setClause = fields
    .map((field) => `${field} = @${field}`)
    .concat("updated_at = @updated_at");

  getDb()
    .prepare(`UPDATE content_plans SET ${setClause.join(", ")} WHERE id = @id`)
    .run(values);

  return getContentPlanById(id);
}

export function listInspirationItems() {
  const rows = getDb()
    .prepare(`${inspirationBaseSelect} ORDER BY captured_at DESC`)
    .all() as Row[];
  return rows.map(mapInspiration);
}

export function createInspirationItem(input: {
  link?: string | null;
  screenshot?: string | null;
  sourceAccount: string;
  type: InspirationRecord["type"];
  hookSummary: string;
  reusableIdea: string;
  tags: string;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    link: input.link ?? null,
    screenshot: input.screenshot ?? "截图占位",
    source_account: input.sourceAccount,
    type: input.type,
    hook_summary: input.hookSummary,
    reusable_idea: input.reusableIdea,
    tags: input.tags,
    captured_at: now,
    created_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO inspiration_items (
        id, link, screenshot, source_account, type, hook_summary,
        reusable_idea, tags, captured_at, created_at
      ) VALUES (
        @id, @link, @screenshot, @source_account, @type, @hook_summary,
        @reusable_idea, @tags, @captured_at, @created_at
      )
    `)
    .run(record);

  const row = getDb()
    .prepare(`${inspirationBaseSelect} WHERE id = ?`)
    .get(record.id) as Row;
  return mapInspiration(row);
}

export function listCompetitorObservations() {
  const rows = getDb()
    .prepare(`${competitorBaseSelect} ORDER BY observed_at DESC`)
    .all() as Row[];
  return rows.map(mapCompetitor);
}

export function createCompetitorObservation(input: {
  accountName: string;
  platform: CompetitorRecord["platform"];
  contentLink?: string | null;
  contentTopic: string;
  hookPoint: string;
  commentInsight: string;
  takeaway: string;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    account_name: input.accountName,
    platform: input.platform,
    content_link: input.contentLink ?? null,
    content_topic: input.contentTopic,
    hook_point: input.hookPoint,
    comment_insight: input.commentInsight,
    takeaway: input.takeaway,
    observed_at: now,
    created_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO competitor_observations (
        id, account_name, platform, content_link, content_topic,
        hook_point, comment_insight, takeaway, observed_at, created_at
      ) VALUES (
        @id, @account_name, @platform, @content_link, @content_topic,
        @hook_point, @comment_insight, @takeaway, @observed_at, @created_at
      )
    `)
    .run(record);

  const row = getDb()
    .prepare(`${competitorBaseSelect} WHERE id = ?`)
    .get(record.id) as Row;
  return mapCompetitor(row);
}

export function listHotTopics() {
  const rows = getDb()
    .prepare(`${topicBaseSelect} ORDER BY happened_at DESC`)
    .all() as Row[];
  return rows.map(mapHotTopic);
}

export function createHotTopic(input: {
  keyword: string;
  type: HotTopicRecord["type"];
  source: string;
  happenedAt?: string | null;
  usableDirection: string;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    keyword: input.keyword,
    type: input.type,
    source: input.source,
    happened_at: input.happenedAt ?? now,
    usable_direction: input.usableDirection,
    created_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO hot_topics (
        id, keyword, type, source, happened_at, usable_direction, created_at
      ) VALUES (
        @id, @keyword, @type, @source, @happened_at, @usable_direction, @created_at
      )
    `)
    .run(record);

  const row = getDb()
    .prepare(`${topicBaseSelect} WHERE id = ?`)
    .get(record.id) as Row;
  return mapHotTopic(row);
}

export function listReportDrafts(limit = 10) {
  const rows = getDb()
    .prepare(`${reportBaseSelect} ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Row[];
  return rows.map(mapReportDraft);
}

export function saveReportDraft(input: {
  rawInput: string;
  dailyReport: string;
  weeklyDraft: string;
  emailSubject: string;
  emailBody: string;
}) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    raw_input: input.rawInput,
    daily_report: input.dailyReport,
    weekly_draft: input.weeklyDraft,
    email_subject: input.emailSubject,
    email_body: input.emailBody,
    created_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO report_drafts (
        id, raw_input, daily_report, weekly_draft, email_subject, email_body, created_at
      ) VALUES (
        @id, @raw_input, @daily_report, @weekly_draft, @email_subject, @email_body, @created_at
      )
    `)
    .run(record);

  const row = getDb()
    .prepare(`${reportBaseSelect} WHERE id = ?`)
    .get(record.id) as Row;
  return mapReportDraft(row);
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const tasks = listTasks();
  const todayInterval = getAppDayInterval();
  const todayTasks = tasks.filter(
    (task) =>
      task.isTodayFocus ||
      (task.dueAt
        ? isWithinInterval(parseISO(task.dueAt), {
            start: todayInterval.start,
            end: todayInterval.end,
          })
        : false),
  );
  const focusTasks = [...tasks.filter((task) => task.isTodayFocus)]
    .sort(compareTasks)
    .slice(0, 3);

  if (focusTasks.length < 3) {
    for (const task of todayTasks.sort(compareTasks)) {
      if (!focusTasks.find((item) => item.id === task.id) && focusTasks.length < 3) {
        focusTasks.push(task);
      }
    }
  }

  const counts = {
    total: todayTasks.length,
    completed: todayTasks.filter((task) => task.status === "DONE").length,
    waiting: todayTasks.filter((task) => task.status === "WAITING").length,
    overdue: tasks.filter(
      (task) => task.dueAt && parseISO(task.dueAt) < new Date() && task.status !== "DONE",
    ).length,
  };

  return {
    focusTasks,
    todayTasks: todayTasks.sort(compareTasks),
    counts,
    workspaceDay: getWorkspaceDay(),
    latestReport: listReportDrafts(1)[0] ?? null,
  };
}

export function isTaskInCurrentWeek(task: TaskRecord) {
  if (!task.dueAt) return false;
  const weekInterval = getAppWeekInterval();
  return isWithinInterval(parseISO(task.dueAt), {
    start: weekInterval.start,
    end: weekInterval.end,
  });
}
