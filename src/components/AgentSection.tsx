import { Bot, BrainCircuit, CircleCheck, CircleX, FileSearch, ListChecks, LoaderCircle, NotebookPen, ScanSearch, Sparkles } from "lucide-react";
import { forwardRef } from "react";
import { cx, ErrorBanner, SampleBadge, Section } from "./ui";

export const AGENT_STEPS = [
  { label: "Reading course materials", hint: "Parsing your syllabus and lecture notes", icon: FileSearch },
  { label: "Identifying upcoming exams", hint: "Prioritizing by date and weight", icon: ScanSearch },
  { label: "Analyzing relevant notes", hint: "Matching lecture content to exam topics", icon: BrainCircuit },
  { label: "Preparing study guide", hint: "Organizing key concepts and terms", icon: NotebookPen },
  { label: "Generating practice questions", hint: "Writing a 5-question quiz", icon: ListChecks },
] as const;

export type AgentPhase = "idle" | "running" | "done" | "error";

interface Props {
  phase: AgentPhase;
  /** Step currently highlighted while running (visual only). */
  activeStep: number;
  /** Step index to mark as failed (on error, or when only the quiz failed). */
  failedStep: number | null;
  error: { message: string; detail?: string } | null;
  demoMode: boolean;
  focusLabel?: string;
  onRun: () => void;
}

export const AgentSection = forwardRef<HTMLElement, Props>(function AgentSection(
  { phase, activeStep, failedStep, error, demoMode, focusLabel, onRun },
  ref,
) {
  const statusPill =
    phase === "running" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-indigo-500" />
        </span>
        Agent working
      </span>
    ) : phase === "done" ? (
      <span className="flex items-center gap-2">
        {demoMode && <SampleBadge />}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <CircleCheck className="size-3.5" />
          {failedStep !== null ? "Finished with issues" : "Completed"}
        </span>
      </span>
    ) : null;

  return (
    <Section
      ref={ref}
      step={3}
      icon={Bot}
      title="AI Agent Activity"
      subtitle="One click: the agent studies your materials and builds a plan."
      aside={statusPill}
    >
      {phase === "idle" ? (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/25">
                <Sparkles className="size-3" />
                Autonomous agent
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                {focusLabel ? `Get ready for your ${focusLabel}` : "Build your study plan"}
              </h3>
              <p className="mt-1 max-w-md text-sm text-white/80">
                The agent reads your materials, finds what matters for your next exam, and writes a study guide plus a practice quiz.
              </p>
            </div>
            <button
              onClick={onRun}
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              <Sparkles className="size-4 transition group-hover:rotate-12" />
              Run Academic Agent
            </button>
          </div>
        </div>
      ) : (
        <>
          <ol className="relative space-y-1" aria-live="polite">
            {AGENT_STEPS.map((s, i) => {
              const state =
                failedStep === i && phase !== "running"
                  ? "failed"
                  : phase === "done"
                    ? "complete"
                    : phase === "error" && i > (failedStep ?? activeStep)
                      ? "pending"
                      : i < activeStep
                        ? "passed"
                        : i === activeStep && phase === "running"
                          ? "active"
                          : "pending";
              return (
                <li key={s.label} className="relative flex gap-3">
                  {i < AGENT_STEPS.length - 1 && (
                    <span
                      className={cx(
                        "absolute left-[15px] top-9 h-[calc(100%-1.75rem)] w-px transition-colors duration-500",
                        state === "complete" ? "bg-emerald-300" : state === "passed" ? "bg-indigo-200" : "bg-zinc-200",
                      )}
                    />
                  )}
                  <div
                    className={cx(
                      "relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-500",
                      state === "complete" && "bg-emerald-50 text-emerald-600 ring-emerald-200",
                      state === "failed" && "bg-rose-50 text-rose-600 ring-rose-200",
                      state === "active" && "bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.15)] ring-indigo-600",
                      state === "passed" && "bg-indigo-50 text-indigo-500 ring-indigo-200",
                      state === "pending" && "bg-white text-zinc-300 ring-zinc-200",
                    )}
                  >
                    {state === "complete" ? (
                      <CircleCheck className="size-4" />
                    ) : state === "failed" ? (
                      <CircleX className="size-4" />
                    ) : state === "active" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <s.icon className="size-4" />
                    )}
                  </div>
                  <div
                    className={cx(
                      "flex-1 rounded-lg px-3 py-2 transition-colors duration-500",
                      state === "active" && "bg-indigo-50/70",
                    )}
                  >
                    <p
                      className={cx(
                        "text-sm font-medium transition-colors",
                        state === "pending" ? "text-zinc-400" : state === "failed" ? "text-rose-700" : "text-zinc-800",
                      )}
                    >
                      {s.label}
                    </p>
                    <p className={cx("text-xs", state === "pending" ? "text-zinc-300" : "text-zinc-500")}>{s.hint}</p>
                    {state === "active" && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-indigo-100">
                        <div className="shimmer-bar h-full w-full animate-shimmer rounded-full" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {phase === "running" && (
            <p className="mt-3 text-[11px] text-zinc-400">
              {demoMode
                ? "Demo mode: this run is simulated with sample data."
                : "Workflow overview. Results appear only after the agent responds."}
            </p>
          )}
          {error && (
            <div className="mt-4">
              <ErrorBanner message={error.message} detail={error.detail} onRetry={onRun} />
            </div>
          )}
        </>
      )}
    </Section>
  );
});
