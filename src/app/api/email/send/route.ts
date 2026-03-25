import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      todo: "邮件发送接口已预留，但当前 MVP 未接入 SMTP。请先复制邮件正文，或使用 mail 客户端 / 企业微信粘贴发送。",
    },
    { status: 501 },
  );
}
