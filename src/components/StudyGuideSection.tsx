import { BookOpen, Lightbulb, Target } from "lucide-react";
import { forwardRef } from "react";
import type { StudyGuide } from "@/lib/types";
import { SampleBadge, Section } from "./ui";
import { GuideMarkdown } from "./GuideMarkdown";
import { formatDueDate } from "@/lib/dates";

export const StudyGuideSection = forwardRef<HTMLElement, { guide: StudyGuide; demoMode: boolean }>(
  function StudyGuideSection({ guide, demoMode }, ref) {
    return (
      <Section
        ref={ref}
        step={4}
        icon={BookOpen}
        title="Generated Study Guide"
        subtitle={guide.course ? `${guide.title} · ${guide.course}` : guide.title}
        aside={demoMode ? <SampleBadge /> : null}
      >
        {guide.examDate && <p className="mb-4 text-xs font-medium text-indigo-600">Exam: {formatDueDate(guide.examDate)}</p>}
        {guide.content && <GuideMarkdown content={guide.content} />}
        {(guide.summary || guide.focus) && (
          <div className="glass-feature rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-4">
            {guide.focus && (
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                <Target className="size-3.5" />
                Focus: {guide.focus}
              </p>
            )}
            {guide.summary && <p className="text-sm leading-relaxed text-zinc-700">{guide.summary}</p>}
          </div>
        )}

        {guide.sections.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {guide.sections.map((s, i) => (
              <div
                key={s.heading + i}
                style={{ animationDelay: `${i * 80}ms` }}
                className="glass-inset animate-fade-up rounded-xl border border-zinc-200 bg-white p-4"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <span className="flex size-5 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {s.heading}
                </h3>
                {s.points.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {s.points.map((p, j) => (
                      <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-zinc-600">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-violet-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {guide.keyTerms.length > 0 && (
          <div className="glass-inset mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Lightbulb className="size-4 text-amber-500" />
              Key terms
            </h3>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {guide.keyTerms.map((t) => (
                <div key={t.term}>
                  <dt className="text-[13px] font-semibold text-zinc-800">{t.term}</dt>
                  {t.definition && <dd className="text-[13px] text-zinc-500">{t.definition}</dd>}
                </div>
              ))}
            </dl>
          </div>
        )}
      </Section>
    );
  },
);
