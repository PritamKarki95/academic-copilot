import { FlaskConical, GraduationCap, RotateCcw } from "lucide-react";
import { API_CONFIG } from "@/lib/api";
import { cx } from "./ui";

interface Props {
  demoMode: boolean;
  onModeChange: (demo: boolean) => void;
  canReset: boolean;
  onReset: () => void;
  busy: boolean;
}

export function Header({ demoMode, onModeChange, canReset, onReset, busy }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.8)]">
            <GraduationCap className="size-[18px]" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-zinc-900">Academic Copilot</p>
            <p className="hidden text-xs text-zinc-500 sm:block">Your autonomous study agent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReset && (
            <button
              onClick={onReset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Start over</span>
            </button>
          )}
          <div
            role="radiogroup"
            aria-label="Data source"
            className="flex rounded-lg border border-zinc-200 bg-zinc-100/70 p-0.5 text-xs font-medium"
          >
            <ModeButton active={!demoMode} disabled={busy} onClick={() => onModeChange(false)}>
              <span className={cx("size-1.5 rounded-full", !demoMode ? "bg-emerald-500" : "bg-zinc-400")} />
              Live
            </ModeButton>
            <ModeButton active={demoMode} disabled={busy} onClick={() => onModeChange(true)}>
              <FlaskConical className={cx("size-3", demoMode ? "text-amber-600" : "text-zinc-400")} />
              Demo
            </ModeButton>
          </div>
        </div>
      </div>

      {demoMode ? (
        <div className="border-t border-amber-200/70 bg-amber-50/90 px-4 py-1.5 text-center text-xs font-medium text-amber-800">
          DEMO MODE — showing built-in sample data. No backend is called.
        </div>
      ) : (
        <div className="border-t border-zinc-100 bg-white/60 px-4 py-1.5 text-center text-xs text-zinc-500">
          Live mode — connected to <span className="font-mono text-zinc-700">{API_CONFIG.baseUrl}</span>
        </div>
      )}
    </header>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition disabled:cursor-not-allowed",
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
      )}
    >
      {children}
    </button>
  );
}
