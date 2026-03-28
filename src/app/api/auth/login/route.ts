import { NextResponse } from "next/server";

import {
  SITE_AUTH_COOKIE,
  createSiteAuthToken,
  getSitePassword,
} from "@/lib/site-auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = await request.json();
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!password) {
    return NextResponse.json(
      { error: "\u8bf7\u5148\u8f93\u5165\u8bbf\u95ee\u5bc6\u7801" },
      { status: 400 },
    );
  }

  if (password !== getSitePassword()) {
    return NextResponse.json(
      { error: "\u5bc6\u7801\u4e0d\u6b63\u786e" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: await createSiteAuthToken(password),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
