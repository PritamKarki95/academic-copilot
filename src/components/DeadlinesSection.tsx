import { BookOpen, CalendarClock, ClipboardList, FileQuestion, FolderKanban, GraduationCap, Inbox } from "lucide-react";
import { forwardRef } from "react";
import { daysLabel, daysUntil, formatDueDate } from "@/lib/dates";
import type { AcademicEvent, EventType } from "@/lib/types";
import { cx, SampleBadge, Section } from "./ui";

const TYPE_STYLE: Record<EventType, { label: string; icon: typeof BookOpen; cls: string }> = {
  exam: { label: "Exam", icon: GraduationCap, cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  assignment: { label: "Assignment", icon: ClipboardList, cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  quiz: { label: "Quiz", icon: FileQuestion, cls: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200" },
  project: { label: "Project", icon: FolderKanban, cls: "bg-teal-50 text-teal-700 ring-teal-200" },
  other: { label: "Deadline", icon: BookOpen, cls: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
};

function urgency(days: number | null) {
  if (days === null) return { pill: "bg-zinc-100 text-zinc-600", bar: "bg-zinc-300", pct: 0 };
  if (days < 0) return { pill: "bg-zinc-100 text-zinc-500", bar: "bg-zinc-300", pct: 100 };
  if (days <= 3) return { pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", bar: "bg-rose-500", pct: 92 };
  if (days <= 7) return { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", bar: "bg-amber-500", pct: 70 };
  if (days <= 21) return { pill: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200", bar: "bg-indigo-500", pct: 40 };
  return { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", bar: "bg-emerald-500", pct: 15 };
}

interface Props {
  events: AcademicEvent[];
  demoMode: boolean;
}

export const DeadlinesSection = forwardRef<HTMLElement, Props>(function DeadlinesSection({ events, demoMode }, ref) {
  const withDays = events.map((e) => ({ e, days: daysUntil(e.dueDate) }));
  const upcoming = withDays.filter((x) => x.days === null || x.days >= 0);
  const nextExam = upcoming.find((x) => x.e.type === "exam");
  const nextDue = upcoming.find((x) => x.days !== null);
  const examCount = events.filter((e) => e.type === "exam").length;

  return (
    <Section
      ref={ref}
      step={2}
      icon={CalendarClock}
      title="Discovered Deadlines"
      subtitle="Extracted automatically from your documents."
      aside={demoMode ? <SampleBadge /> : null}
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-200 py-10 text-center">
          <Inbox className="mb-2 size-6 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-700">No deadlines were found in these documents.</p>
          <p className="mt-1 text-xs text-zinc-500">Try uploading the course syllabus, which usually lists exam and due dates.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat value={events.length} label={events.length === 1 ? "Deadline" : "Deadlines"} />
            <Stat value={examCount} label={examCount === 1 ? "Exam" : "Exams"} />
            <Stat value={nextDue?.days ?? "—"} label={nextDue ? "Days to next due" : "Next due"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {withDays.map(({ e, days }, i) => {
              const t = TYPE_STYLE[e.type];
              const u = urgency(days);
              const isFocus = nextExam?.e.id === e.id;
              return (
                <article
                  key={e.id}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={cx(
                    "animate-fade-up relative overflow-hidden rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md",
                    isFocus ? "border-violet-300 ring-2 ring-violet-100" : "border-zinc-200",
                    days !== null && days < 0 && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1", t.cls)}>
                      <t.icon className="size-3" />
                      {t.label}
                    </span>
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", u.pill)}>
                      {daysLabel(days)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-zinc-900">{e.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{e.course}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                      <CalendarClock className="size-3.5 text-zinc-400" />
                      {formatDueDate(e.dueDate)}
                    </span>
                    {e.weight && <span className="text-zinc-500">Worth {e.weight}</span>}
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className={cx("h-full rounded-full transition-all duration-700", u.bar)} style={{ width: `${u.pct}%` }} />
                  </div>
                  {isFocus && <p className="mt-2 text-[11px] font-medium text-violet-600">★ Your next exam</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
});

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 px-3 py-2.5">
      <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
