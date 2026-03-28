import type {
  ContentStatus,
  ContentWorkflowStage,
  InspirationType,
  TaskPriority,
  TaskStatus,
  TopicType,
  WorkspaceProgress,
} from "@/lib/types";

export function taskPriorityTone(priority: TaskPriority) {
  if (priority === "CRITICAL") return "danger";
  if (priority === "HIGH") return "warning";
  return "neutral";
}

export function taskStatusTone(status: TaskStatus) {
  if (status === "DONE") return "success";
  if (status === "IN_PROGRESS") return "accent";
  if (status === "WAITING") return "warning";
  return "neutral";
}

export function contentStatusTone(status: ContentStatus) {
  if (status === "REVIEWED" || status === "PUBLISHED") return "success";
  if (status === "SCRIPTING" || status === "SHOOTING" || status === "EDITING") return "accent";
  if (status === "SCHEDULED") return "warning";
  return "neutral";
}

export function workflowStageTone(stage: ContentWorkflowStage) {
  if (stage === "DONE") return "success";
  if (stage === "BUSINESS" || stage === "INVENTORY" || stage === "BOOKING") return "warning";
  if (stage === "SCRIPT" || stage === "SHOT" || stage === "ASSETS" || stage === "EDIT") {
    return "accent";
  }
  return "neutral";
}

export function workspaceTone(status: WorkspaceProgress) {
  if (status === "COMPLETE") return "success";
  if (status === "BLOCKED") return "danger";
  if (status === "STRETCHED") return "warning";
  if (status === "FOCUSED") return "accent";
  return "neutral";
}

export function topicTone(type: TopicType) {
  if (type === "TREND") return "danger";
  if (type === "EMOTION") return "accent";
  if (type === "AUDIENCE") return "warning";
  return "neutral";
}

export function inspirationTone(type: InspirationType) {
  if (type === "TITLE" || type === "COPY") return "accent";
  if (type === "COMMENTS") return "warning";
  return "neutral";
}
