import { NextResponse } from "next/server";

import { deleteTask, getTaskById, updateTask } from "@/lib/repository";
import { isOneOf } from "@/lib/options";
import {
  TASK_CADENCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getTaskById(id)) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const task = updateTask(id, {
    title: body.title?.trim(),
    type: isOneOf(body.type, TASK_TYPES) ? body.type : undefined,
    priority: isOneOf(body.priority, TASK_PRIORITIES) ? body.priority : undefined,
    dueAt: body.dueAt === undefined ? undefined : body.dueAt || null,
    owner: body.owner === undefined ? undefined : body.owner?.trim() || null,
    status: isOneOf(body.status, TASK_STATUSES) ? body.status : undefined,
    notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
    cadence: isOneOf(body.cadence, TASK_CADENCES) ? body.cadence : undefined,
    isTodayFocus:
      typeof body.isTodayFocus === "boolean" ? body.isTodayFocus : undefined,
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getTaskById(id)) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const task = deleteTask(id);
  return NextResponse.json(task);
}
