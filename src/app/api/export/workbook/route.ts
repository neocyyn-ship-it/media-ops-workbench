import { NextResponse } from "next/server";
import { utils, write } from "xlsx";

import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
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
      任务名称: task.title,
      类型: TASK_TYPE_LABELS[task.type],
      优先级: TASK_PRIORITY_LABELS[task.priority],
      截止时间: task.dueAt ?? "",
      相关人: task.owner ?? "",
      状态: TASK_STATUS_LABELS[task.status],
      今日重点: task.isTodayFocus ? "是" : "否",
      备注: task.notes ?? "",
    })),
  );
  utils.book_append_sheet(workbook, taskSheet, "任务");

  const contentSheet = utils.json_to_sheet(
    listContentPlans().map((plan) => ({
      标题: plan.title,
      内容类型: CONTENT_TYPE_LABELS[plan.contentType],
      目标人群: plan.audience,
      场景: plan.scenario,
      产品: plan.product,
      发布时间: plan.publishAt ?? "",
      状态: CONTENT_STATUS_LABELS[plan.status],
      数据回填: plan.dataNote ?? "",
      脚本: plan.script,
    })),
  );
  utils.book_append_sheet(workbook, contentSheet, "内容排期");

  const inspirationSheet = utils.json_to_sheet(
    listInspirationItems().map((item) => ({
      来源账号: item.sourceAccount,
      类型: item.type,
      爆点总结: item.hookSummary,
      可复用点: item.reusableIdea,
      标签: item.tags,
      链接: item.link ?? "",
    })),
  );
  utils.book_append_sheet(workbook, inspirationSheet, "素材库");

  const competitorSheet = utils.json_to_sheet(
    listCompetitorObservations().map((item) => ({
      账号名: item.accountName,
      平台: PLATFORM_LABELS[item.platform],
      内容主题: item.contentTopic,
      爆点: item.hookPoint,
      评论区洞察: item.commentInsight,
      启发: item.takeaway,
      日期: item.observedAt,
    })),
  );
  utils.book_append_sheet(workbook, competitorSheet, "竞品观察");

  const topicSheet = utils.json_to_sheet(
    listHotTopics().map((item) => ({
      关键词: item.keyword,
      类型: TOPIC_TYPE_LABELS[item.type],
      来源: item.source,
      日期: item.happenedAt,
      可用方向: item.usableDirection,
    })),
  );
  utils.book_append_sheet(workbook, topicSheet, "热点词");

  const reportSheet = utils.json_to_sheet(
    listReportDrafts(20).map((draft) => ({
      创建时间: draft.createdAt,
      原始输入: draft.rawInput,
      日报: draft.dailyReport,
      周报草稿: draft.weeklyDraft,
      邮件主题: draft.emailSubject,
      邮件正文: draft.emailBody,
    })),
  );
  utils.book_append_sheet(workbook, reportSheet, "日报记录");

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
