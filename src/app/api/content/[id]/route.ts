import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import { deleteContentPlan, getContentPlanById, updateContentPlan } from "@/lib/repository";
import {
  CALENDAR_LABELS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  CONTENT_WORKFLOW_STAGES,
} from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getContentPlanById(id)) {
    return NextResponse.json({ error: "内容排期不存在" }, { status: 404 });
  }

  const plan = updateContentPlan(id, {
    title: body.title === undefined ? undefined : body.title?.trim(),
    contentType: isOneOf(body.contentType, CONTENT_TYPES) ? body.contentType : undefined,
    audience: body.audience === undefined ? undefined : body.audience?.trim() || "",
    scenario: body.scenario === undefined ? undefined : body.scenario?.trim() || "",
    product: body.product === undefined ? undefined : body.product?.trim() || "",
    script: body.script === undefined ? undefined : body.script?.trim() || "",
    publishAt: body.publishAt === undefined ? undefined : body.publishAt || null,
    status: isOneOf(body.status, CONTENT_STATUSES) ? body.status : undefined,
    workflowStage: isOneOf(body.workflowStage, CONTENT_WORKFLOW_STAGES)
      ? body.workflowStage
      : undefined,
    calendarLabel: isOneOf(body.calendarLabel, CALENDAR_LABELS)
      ? body.calendarLabel
      : undefined,
    dataNote: body.dataNote === undefined ? undefined : body.dataNote?.trim() || null,
    selectionNotes:
      body.selectionNotes === undefined ? undefined : body.selectionNotes?.trim() || null,
    businessNotes:
      body.businessNotes === undefined ? undefined : body.businessNotes?.trim() || null,
    inventoryNotes:
      body.inventoryNotes === undefined ? undefined : body.inventoryNotes?.trim() || null,
    shootDate: body.shootDate === undefined ? undefined : body.shootDate || null,
    stylingNotes:
      body.stylingNotes === undefined ? undefined : body.stylingNotes?.trim() || null,
    cameraNotes:
      body.cameraNotes === undefined ? undefined : body.cameraNotes?.trim() || null,
    voiceoverNotes:
      body.voiceoverNotes === undefined ? undefined : body.voiceoverNotes?.trim() || null,
    assetNotes: body.assetNotes === undefined ? undefined : body.assetNotes?.trim() || null,
    editBrief: body.editBrief === undefined ? undefined : body.editBrief?.trim() || null,
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getContentPlanById(id)) {
    return NextResponse.json({ error: "内容排期不存在" }, { status: 404 });
  }

  const plan = deleteContentPlan(id);
  return NextResponse.json(plan);
}
