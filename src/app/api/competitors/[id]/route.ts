import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import {
  deleteCompetitorObservation,
  getCompetitorObservationById,
  updateCompetitorObservation,
} from "@/lib/repository";
import { PLATFORMS } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getCompetitorObservationById(id)) {
    return NextResponse.json({ error: "竞品观察不存在" }, { status: 404 });
  }

  const item = updateCompetitorObservation(id, {
    accountName: body.accountName === undefined ? undefined : body.accountName?.trim(),
    platform: isOneOf(body.platform, PLATFORMS) ? body.platform : undefined,
    contentLink: body.contentLink === undefined ? undefined : body.contentLink?.trim() || null,
    contentTopic: body.contentTopic === undefined ? undefined : body.contentTopic?.trim(),
    hookPoint: body.hookPoint === undefined ? undefined : body.hookPoint?.trim(),
    commentInsight:
      body.commentInsight === undefined ? undefined : body.commentInsight?.trim(),
    takeaway: body.takeaway === undefined ? undefined : body.takeaway?.trim(),
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getCompetitorObservationById(id)) {
    return NextResponse.json({ error: "竞品观察不存在" }, { status: 404 });
  }

  const item = deleteCompetitorObservation(id);
  return NextResponse.json(item);
}
