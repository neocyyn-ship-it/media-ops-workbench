import { NextResponse } from "next/server";

import { isOneOf } from "@/lib/options";
import { deleteHotTopic, getHotTopicById, updateHotTopic } from "@/lib/repository";
import { TOPIC_TYPES } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!getHotTopicById(id)) {
    return NextResponse.json({ error: "热点不存在" }, { status: 404 });
  }

  const item = updateHotTopic(id, {
    keyword: body.keyword === undefined ? undefined : body.keyword?.trim(),
    type: isOneOf(body.type, TOPIC_TYPES) ? body.type : undefined,
    source: body.source === undefined ? undefined : body.source?.trim(),
    happenedAt: body.happenedAt === undefined ? undefined : body.happenedAt || null,
    usableDirection:
      body.usableDirection === undefined ? undefined : body.usableDirection?.trim(),
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getHotTopicById(id)) {
    return NextResponse.json({ error: "热点不存在" }, { status: 404 });
  }

  const item = deleteHotTopic(id);
  return NextResponse.json(item);
}
