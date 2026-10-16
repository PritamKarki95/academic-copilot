import type { LucideIcon } from "lucide-react";
import { FlaskConical, RotateCcw, TriangleAlert } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface SectionProps {
  step: number;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}

/** A numbered section card. Fades in when it first appears (progressive disclosure). */
export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  { step, icon: Icon, title, subtitle, aside, children },
  ref,
) {
  return (
    <section
      ref={ref}
      className="glass-panel animate-fade-up scroll-mt-24 rounded-2xl border border-zinc-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,16,32,0.04),0_8px_24px_-12px_rgba(15,16,32,0.08)] backdrop-blur-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100">
            <Icon className="size-[18px]" strokeWidth={2} />
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
              {step}
            </span>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
});

export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <FlaskConical className="size-3" />
      Sample data
    </span>
  );
}

export function ErrorBanner({ message, detail, onRetry }: { message: string; detail?: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="animate-fade-up flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-500" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{message}</p>
        {detail && <p className="mt-1 break-words font-mono text-xs text-rose-700/80">{detail}</p>}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
        >
          <RotateCcw className="size-3" />
          Retry
        </button>
      )}
    </div>
  );
}

export const primaryButton =
  "glass-primary group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_16px_-6px_rgba(99,102,241,0.7)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

export const secondaryButton =
  "glass-secondary inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
