"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Sparkles } from "lucide-react";

import { NAV_ITEMS } from "@/lib/options";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <aside className="panel sticky top-4 hidden h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col justify-between p-5 lg:flex">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex rounded-full bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
              LOOK OPS DESK
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">个人新媒体运营工作台</h1>
              <p className="mt-2 text-sm leading-6 muted-text">
                面向服装类小红书岗位的本地 MVP，先把任务、内容、复盘和素材沉淀跑起来。
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium",
                    active
                      ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                      : "bg-white/65 hover:bg-white",
                  )}
                >
                  <span>{item.label}</span>
                  {active ? <Sparkles className="h-4 w-4" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <a className="button-secondary w-full gap-2" href="/api/export/workbook">
          <Download className="h-4 w-4" />
          导出 Excel 工作簿
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="panel sticky top-4 z-30 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="tiny-label">Fashion Content Ops</div>
                <div className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
                  本地可运行的运营工作台
                </div>
              </div>
              <a className="button-secondary shrink-0 gap-2" href="/api/export/workbook">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">导出 Excel</span>
              </a>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
                      active
                        ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
                        : "border bg-white/85",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="pb-6">{children}</main>
      </div>
    </div>
  );
}
