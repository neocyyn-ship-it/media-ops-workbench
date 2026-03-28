"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { fetchJson } from "@/lib/client-fetch";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      await fetchJson<{ success: true }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u5bc6\u7801\u9a8c\u8bc1\u5931\u8d25",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel mx-auto w-full max-w-xl overflow-hidden">
      <div className="border-b bg-white/70 px-6 py-5 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          {"\u8bbf\u95ee\u4fdd\u62a4"}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {"\u8bf7\u8f93\u5165\u7ad9\u70b9\u5bc6\u7801"}
        </h1>
        <p className="mt-2 text-sm leading-6 muted-text">
          {"\u8fd9\u4e2a\u7248\u672c\u5df2\u52a0\u4e0a\u5168\u7ad9\u53e3\u4ee4\uff0c\u8f93\u5165\u6b63\u786e\u5bc6\u7801\u540e\u624d\u80fd\u67e5\u770b\u5de5\u4f5c\u53f0\u548c API\u3002"}
        </p>
      </div>

      <form className="space-y-4 px-6 py-6 sm:px-8 sm:py-8" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="site-password">
            {"\u7ad9\u70b9\u5bc6\u7801"}
          </label>
          <input
            id="site-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={"123"}
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          className="button-primary w-full"
          disabled={pending}
        >
          {pending ? "\u9a8c\u8bc1\u4e2d..." : "\u8fdb\u5165\u5de5\u4f5c\u53f0"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="panel mx-auto w-full max-w-xl px-6 py-10 text-center muted-text">{"\u6b63\u5728\u52a0\u8f7d\u767b\u5f55\u9875..."}</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
