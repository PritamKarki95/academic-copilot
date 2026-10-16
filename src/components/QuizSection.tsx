"use client";

import { CircleCheck, CircleX, ListChecks, LoaderCircle, RotateCcw, Trophy } from "lucide-react";
import { forwardRef, useState } from "react";
import type { Quiz } from "@/lib/types";
import { quizScore } from "@/lib/quiz";
import { cx, ErrorBanner, primaryButton, SampleBadge, secondaryButton, Section } from "./ui";

interface Props {
  quiz: Quiz | null;
  loading: boolean;
  error: { message: string; detail?: string } | null;
  onRetry: () => void;
  demoMode: boolean;
}

const LETTERS = "ABCDEFGH";

export const QuizSection = forwardRef<HTMLElement, Props>(function QuizSection(
  { quiz, loading, error, onRetry, demoMode },
  ref,
) {
  return (
    <Section
      ref={ref}
      step={5}
      icon={ListChecks}
      title="Interactive Quiz"
      subtitle={quiz ? `${quiz.title} · ${quiz.questions.length} questions` : "Practice questions generated from your notes."}
      aside={demoMode && quiz ? <SampleBadge /> : null}
    >
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <LoaderCircle className="size-4 animate-spin text-indigo-500" />
          Generating practice questions…
        </div>
      )}
      {error && <ErrorBanner message={error.message} detail={error.detail} onRetry={onRetry} />}
      {quiz && <QuizBody key={JSON.stringify(quiz)} quiz={quiz} />}
    </Section>
  );
});

function QuizBody({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0);

  const { total, answered, score, percent: pct } = quizScore(quiz, answers);

  function retake() {
    setAnswers({});
    setSubmitted(false);
    setCurrent(0);
  }

  return (
    <div>
      {submitted && <ScoreCard score={score} total={total} pct={pct} onRetake={retake} />}

      {!submitted && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-zinc-500">
            {answered}/{total} answered
          </span>
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => {
          if (!submitted && qi !== current) return null;
          const picked = answers[q.id];
          const correct = picked === q.correctIndex;
          return (
            <li
              key={q.id}
              style={{ animationDelay: `${qi * 60}ms` }}
              className={cx(
                "animate-fade-up rounded-xl border bg-white p-4 transition",
                submitted ? (correct ? "border-emerald-200" : "border-rose-200") : "border-zinc-200",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                  {qi + 1}
                </span>
                <p className="flex-1 text-sm font-medium leading-relaxed text-zinc-900">{q.question}</p>
                {submitted &&
                  (correct ? (
                    <CircleCheck className="size-5 shrink-0 text-emerald-500" />
                  ) : (
                    <CircleX className="size-5 shrink-0 text-rose-500" />
                  ))}
              </div>

              <div role="group" aria-label={`Question ${qi + 1}`} className="mt-3 grid gap-2 sm:grid-cols-2 sm:pl-9">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  const isRight = oi === q.correctIndex;
                  return (
                    <button
                      key={oi}
                      aria-pressed={isPicked}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition",
                        !submitted &&
                          (isPicked
                            ? "border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100"
                            : "border-zinc-200 text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50/40"),
                        submitted && isRight && "border-emerald-300 bg-emerald-50 text-emerald-900",
                        submitted && isPicked && !isRight && "border-rose-300 bg-rose-50 text-rose-900",
                        submitted && !isPicked && !isRight && "border-zinc-100 text-zinc-400",
                      )}
                    >
                      <span
                        className={cx(
                          "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                          submitted && isRight
                            ? "bg-emerald-500 text-white"
                            : submitted && isPicked
                              ? "bg-rose-500 text-white"
                              : isPicked
                                ? "bg-indigo-500 text-white"
                                : "bg-zinc-100 text-zinc-500",
                        )}
                      >
                        {LETTERS[oi] ?? oi + 1}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {submitted && q.explanation && (
                <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-[13px] leading-relaxed text-zinc-600 sm:ml-9">
                  <span className="font-semibold text-zinc-800">{correct ? "Correct. " : `Answer: ${LETTERS[q.correctIndex]}. `}</span>
                  {q.explanation}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button className={secondaryButton} disabled={current === 0} onClick={() => setCurrent(i => i - 1)}>Previous</button>
          <p className="text-xs text-zinc-500" aria-live="polite">Question {current + 1} of {total}</p>
          <button className={secondaryButton} disabled={current === total - 1} onClick={() => setCurrent(i => i + 1)}>Next</button>
        </div>
      )}
      {!submitted && (
        <div className="mt-5 flex items-center justify-end gap-3">
          {answered < total && <p className="text-xs text-zinc-500">Answer every question to submit.</p>}
          <button className={primaryButton} disabled={answered < total} onClick={() => setSubmitted(true)}>
            Submit answers
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ score, total, pct, onRetake }: { score: number; total: number; pct: number; onRetake: () => void }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const msg =
    pct === 100 ? "Perfect score — you're ready." : pct >= 80 ? "Strong work. Review any you missed." : pct >= 50 ? "Good start. Revisit the study guide topics you missed." : "Worth another pass through the study guide.";
  return (
    <div className="animate-fade-up mb-5 flex flex-col items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 sm:flex-row">
      <div className="relative size-20 shrink-0">
        <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e0e7ff" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-1000"
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-zinc-900">
          {pct}%
        </span>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight text-zinc-900">
          <Trophy className="size-5 text-amber-500" />
          You scored {score} of {total}
        </p>
        <p className="mt-0.5 text-sm text-zinc-600">{msg}</p>
      </div>
      <button className={secondaryButton} onClick={onRetake}>
        <RotateCcw className="size-4" />
        Retake
      </button>
    </div>
  );
}
