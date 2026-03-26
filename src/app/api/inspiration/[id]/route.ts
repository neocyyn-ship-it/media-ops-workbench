import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import {
  deleteInspirationItem,
  getInspirationItemById,
  updateInspirationItem,
} from "@/lib/repository";
import { INSPIRATION_TYPES } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getInspirationItemById(id)) {
    return NextResponse.json({ error: "素材不存在" }, { status: 404 });
  }

  const item = updateInspirationItem(id, {
    link: body.link === undefined ? undefined : body.link?.trim() || null,
    screenshot: body.screenshot === undefined ? undefined : body.screenshot?.trim() || null,
    sourceAccount: body.sourceAccount === undefined ? undefined : body.sourceAccount?.trim(),
    type: isOneOf(body.type, INSPIRATION_TYPES) ? body.type : undefined,
    hookSummary: body.hookSummary === undefined ? undefined : body.hookSummary?.trim(),
    reusableIdea: body.reusableIdea === undefined ? undefined : body.reusableIdea?.trim(),
    tags: body.tags === undefined ? undefined : body.tags?.trim(),
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getInspirationItemById(id)) {
    return NextResponse.json({ error: "素材不存在" }, { status: 404 });
  }

  const item = deleteInspirationItem(id);
  return NextResponse.json(item);
}
