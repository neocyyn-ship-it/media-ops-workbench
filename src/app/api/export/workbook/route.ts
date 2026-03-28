import { utils, write } from "xlsx";

import {
  CALENDAR_LABEL_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  CONTENT_WORKFLOW_STAGE_LABELS,
  PLATFORM_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TOPIC_TYPE_LABELS,
} from "@/lib/options";
import {
  listCompetitorObservations,
  listContentPlans,
  listHotTopics,
  listInspirationItems,
  listReportDrafts,
  listTasks,
} from "@/lib/repository";

export function GET() {
  const workbook = utils.book_new();

  const taskSheet = utils.json_to_sheet(
    listTasks().map((task) => ({
      "\u4efb\u52a1\u540d\u79f0": task.title,
      "\u7c7b\u578b": TASK_TYPE_LABELS[task.type],
      "\u4f18\u5148\u7ea7": TASK_PRIORITY_LABELS[task.priority],
      "\u622a\u6b62\u65f6\u95f4": task.dueAt ?? "",
      "\u8d1f\u8d23\u4eba": task.owner ?? "",
      "\u72b6\u6001": TASK_STATUS_LABELS[task.status],
      "\u4eca\u65e5\u91cd\u70b9": task.isTodayFocus ? "\u662f" : "\u5426",
      "\u5907\u6ce8": task.notes ?? "",
    })),
  );
  utils.book_append_sheet(workbook, taskSheet, "\u4efb\u52a1");

  const contentSheet = utils.json_to_sheet(
    listContentPlans().map((plan) => ({
      "\u6807\u9898": plan.title,
      "\u5185\u5bb9\u7c7b\u578b": CONTENT_TYPE_LABELS[plan.contentType],
      "SOP\u9636\u6bb5": CONTENT_WORKFLOW_STAGE_LABELS[plan.workflowStage],
      "\u65e5\u5386\u6807\u7b7e": plan.calendarLabel ? CALENDAR_LABEL_LABELS[plan.calendarLabel] : "",
      "\u76ee\u6807\u4eba\u7fa4": plan.audience,
      "\u573a\u666f": plan.scenario,
      "\u4ea7\u54c1": plan.product,
      "\u53d1\u5e03\u65f6\u95f4": plan.publishAt ?? "",
      "\u62cd\u6444\u65f6\u95f4": plan.shootDate ?? "",
      "\u72b6\u6001": CONTENT_STATUS_LABELS[plan.status],
      "\u9009\u54c1\u5907\u6ce8": plan.selectionNotes ?? "",
      "\u5546\u52a1\u8ddf\u8fdb": plan.businessNotes ?? "",
      "\u7406\u8d27\u76d8\u70b9": plan.inventoryNotes ?? "",
      "\u7a7f\u642d\u642d\u914d": plan.stylingNotes ?? "",
      "\u955c\u5934\u8bbe\u8ba1": plan.cameraNotes ?? "",
      "\u53e3\u64ad\u8bed\u97f3": plan.voiceoverNotes ?? "",
      "\u7d20\u6750\u6574\u7406": plan.assetNotes ?? "",
      "\u526a\u8f91\u811a\u672c": plan.editBrief ?? "",
      "\u6570\u636e\u5907\u6ce8": plan.dataNote ?? "",
      "\u62cd\u6444\u811a\u672c": plan.script,
    })),
  );
  utils.book_append_sheet(workbook, contentSheet, "\u5185\u5bb9\u6392\u671f");

  const inspirationSheet = utils.json_to_sheet(
    listInspirationItems().map((item) => ({
      "\u6765\u6e90\u8d26\u53f7": item.sourceAccount,
      "\u7c7b\u578b": item.type,
      "\u7206\u70b9\u603b\u7ed3": item.hookSummary,
      "\u53ef\u590d\u7528\u70b9": item.reusableIdea,
      "\u6807\u7b7e": item.tags,
      "\u94fe\u63a5": item.link ?? "",
    })),
  );
  utils.book_append_sheet(workbook, inspirationSheet, "\u7d20\u6750\u5e93");

  const competitorSheet = utils.json_to_sheet(
    listCompetitorObservations().map((item) => ({
      "\u8d26\u53f7\u540d": item.accountName,
      "\u5e73\u53f0": PLATFORM_LABELS[item.platform],
      "\u5185\u5bb9\u4e3b\u9898": item.contentTopic,
      "\u7206\u70b9": item.hookPoint,
      "\u8bc4\u8bba\u533a\u6d1e\u5bdf": item.commentInsight,
      "\u542f\u53d1": item.takeaway,
      "\u65e5\u671f": item.observedAt,
    })),
  );
  utils.book_append_sheet(workbook, competitorSheet, "\u7ade\u54c1\u89c2\u5bdf");

  const topicSheet = utils.json_to_sheet(
    listHotTopics().map((item) => ({
      "\u5173\u952e\u8bcd": item.keyword,
      "\u7c7b\u578b": TOPIC_TYPE_LABELS[item.type],
      "\u6765\u6e90": item.source,
      "\u65e5\u671f": item.happenedAt,
      "\u53ef\u7528\u65b9\u5411": item.usableDirection,
    })),
  );
  utils.book_append_sheet(workbook, topicSheet, "\u70ed\u70b9\u8bcd");

  const reportSheet = utils.json_to_sheet(
    listReportDrafts(20).map((draft) => ({
      "\u521b\u5efa\u65f6\u95f4": draft.createdAt,
      "\u539f\u59cb\u8f93\u5165": draft.rawInput,
      "\u65e5\u62a5": draft.dailyReport,
      "\u5468\u62a5\u8349\u7a3f": draft.weeklyDraft,
      "\u90ae\u4ef6\u4e3b\u9898": draft.emailSubject,
      "\u90ae\u4ef6\u6b63\u6587": draft.emailBody,
    })),
  );
  utils.book_append_sheet(workbook, reportSheet, "\u65e5\u62a5\u8bb0\u5f55");

  const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
  const payload = new Uint8Array(buffer);

  return new Response(
    new Blob([payload], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="media-ops-workbench.xlsx"',
      },
    },
  );
}
