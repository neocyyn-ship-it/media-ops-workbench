import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClassName: Record<Tone, string> = {
  neutral: "bg-white text-[color:var(--muted)]",
  accent: "bg-[color:var(--accent)]/10 text-[color:var(--accent)]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        toneClassName[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
