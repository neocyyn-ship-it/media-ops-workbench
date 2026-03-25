import { NextResponse } from "next/server";

import { createTask, listTasks } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import {
  TASK_CADENCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/types";

export function GET() {
  return NextResponse.json({ tasks: listTasks() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "任务名称不能为空" }, { status: 400 });
  }

  const task = createTask({
    title: body.title.trim(),
    type: isOneOf(body.type, TASK_TYPES) ? body.type : "CONTENT",
    priority: isOneOf(body.priority, TASK_PRIORITIES) ? body.priority : "MEDIUM",
    dueAt: body.dueAt || null,
    owner: body.owner?.trim() || null,
    status: isOneOf(body.status, TASK_STATUSES) ? body.status : "NOT_STARTED",
    notes: body.notes?.trim() || null,
    cadence: isOneOf(body.cadence, TASK_CADENCES) ? body.cadence : "ONE_OFF",
    isTodayFocus: Boolean(body.isTodayFocus),
    sourceText: body.sourceText?.trim() || null,
  });

  return NextResponse.json(task);
}
