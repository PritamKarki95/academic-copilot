"use client";

import { ArrowRight, Bell, BookOpen, CalendarClock, CheckCheck, CircleHelp, GraduationCap, LayoutDashboard, ListChecks, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { daysLabel, daysUntil, formatDueDate } from "@/lib/dates";
import type { AcademicEvent, StudyGuide } from "@/lib/types";
import { cx, primaryButton } from "./ui";

export const VIEWS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "courses", label: "Courses", icon: GraduationCap },
  { id: "deadlines", label: "Deadlines", icon: CalendarClock },
  { id: "guides", label: "Study Guides", icon: BookOpen },
  { id: "quizzes", label: "Practice Quizzes", icon: ListChecks },
] as const;
export type View = (typeof VIEWS)[number]["id"];
export type Activity = { id: number; message: string; time: string };

export function DashboardShell({ view, navigate, demoMode, busy, canRun, onRun, notifications, unread, onRead, header, children }: {
  view: View; navigate: (view: View) => void; demoMode: boolean; busy: boolean; canRun: boolean;
  onRun: () => void; notifications: string[]; unread: boolean; onRead: () => void; header: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <div className="glass-app min-h-screen lg:pl-64">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <aside className="glass-sidebar fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-zinc-200 bg-white p-5 lg:flex">
      <div className="flex items-center gap-2.5 py-3"><div className="glass-icon rounded-xl bg-indigo-600 p-2 text-white"><GraduationCap className="size-5" /></div><div><p className="text-sm font-semibold">Academic Copilot</p><p className="text-xs text-zinc-400">A little ahead, always.</p></div></div>
      <p className="mb-3 mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Your workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">{VIEWS.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined} className={cx("glass-nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", view === id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900")}><Icon className="size-4" />{label}</a>)}</nav>
      <div className="glass-feature mt-auto rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><Sparkles className="mb-2 size-5 text-indigo-500" /><p className="text-sm font-semibold">More learning. Less planning.</p><p className="mt-2 text-xs leading-relaxed text-zinc-500">Your syllabus holds the plan. Let your copilot put it together.</p><p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-indigo-600">{demoMode ? "Demo workspace" : "Live workspace"}</p></div>
    </aside>
    {header}
    <div className="glass-toolbar border-b border-zinc-200 bg-white px-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 py-3">
        <p className="text-xs text-zinc-400">Workspace <span className="px-2">/</span><span className="text-zinc-700">{VIEWS.find(v => v.id === view)?.label}</span></p>
        <div className="flex items-center gap-3"><div className="relative">
          <button className="glass-secondary relative rounded-lg p-2.5 text-zinc-500 hover:bg-zinc-100" aria-label="Notifications" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) onRead(); }}><Bell className="size-4" />{unread && <span className="absolute right-1.5 top-1 size-2 rounded-full bg-indigo-500 ring-2 ring-white" />}</button>
          {open && <div className="glass-popover fixed right-4 top-36 z-30 w-[min(20rem,85vw)] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl sm:absolute sm:right-0 sm:top-11"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Notifications</p><button className="text-xs text-indigo-600" onClick={() => setOpen(false)}>Close</button></div><ul className="max-h-72 space-y-3 overflow-y-auto">{notifications.length ? notifications.map((n, i) => <li key={i} className="border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-600">{demoMode && <span className="font-medium text-amber-700">Sample · </span>}{n}</li>) : <li className="text-xs text-zinc-500">No alerts yet. Upload your syllabus to get started.</li>}</ul></div>}
        </div><button className={primaryButton} disabled={busy || !canRun} onClick={onRun}><Sparkles className="size-4" />{busy ? "Working…" : "Run Agent"}</button></div>
      </div>
      <nav aria-label="Mobile navigation" className="glass-segment mb-3 flex gap-1 overflow-x-auto p-1 lg:hidden">{VIEWS.map(v => <a key={v.id} href={`#${v.id}`} onClick={() => navigate(v.id)} aria-current={view === v.id ? "page" : undefined} className={cx("glass-nav shrink-0 rounded-lg px-3 py-2 text-xs", view === v.id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-zinc-500")}>{v.label}</a>)}</nav>
    </div>
    <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
  </div>;
}

export function Overview({ events, guide, activities, demoMode, onRun, canRun, onDeadlines }: {
  events: AcademicEvent[]; guide: StudyGuide | null; activities: Activity[]; demoMode: boolean; onRun: () => void; canRun: boolean; onDeadlines: () => void;
}) {
  const upcoming = events.filter(e => (daysUntil(e.dueDate) ?? -1) >= 0);
  const exam = upcoming.find(e => e.type === "exam");
  const week = upcoming.filter(e => (daysUntil(e.dueDate) ?? 8) <= 7);
  const stats = [
    { label: "Total courses", value: new Set(events.map(e => e.course)).size, icon: GraduationCap, hint: "From your documents" },
    { label: "Upcoming assignments", value: upcoming.filter(e => e.type === "assignment").length, icon: CalendarClock, hint: "Keep your momentum" },
    { label: "Upcoming exams", value: upcoming.filter(e => e.type === "exam").length, icon: CircleHelp, hint: exam ? `Next: ${formatDueDate(exam.dueDate)}` : "No exams on the horizon" },
    { label: "Study guides", value: guide ? 1 : 0, icon: BookOpen, hint: guide ? "Ready when you are" : "Your next step to prepared" },
  ];
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, hint }) => <div key={label} className="glass-stat glass-panel rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-medium text-zinc-500">{label}</p><Icon className="size-4 text-indigo-400" /></div><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[11px] text-zinc-400">{hint}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="glass-panel rounded-xl border border-zinc-200 bg-white p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">On your horizon</h2><button onClick={onDeadlines} className="flex items-center gap-1 text-xs text-indigo-600">All deadlines <ArrowRight className="size-3" /></button></div>{upcoming.length ? <ul className="divide-y divide-zinc-100">{upcoming.slice(0, 4).map(e => <li key={e.id} className="flex items-center gap-3 py-3"><div className={cx("rounded-lg p-2.5", e.type === "exam" ? "bg-violet-50 text-violet-500" : "bg-sky-50 text-sky-500")}><CalendarClock className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.title}</p><p className="mt-0.5 truncate text-xs text-zinc-400">{e.course}</p></div><div className="text-right"><p className="text-xs font-medium text-zinc-600">{formatDueDate(e.dueDate)}</p><p className={cx("mt-1 text-[11px]", (daysUntil(e.dueDate) ?? 8) <= 3 ? "text-rose-600" : "text-zinc-400")}>{daysLabel(daysUntil(e.dueDate))}</p></div></li>)}</ul> : <EmptyState title="A clear view starts with your syllabus" description="Upload course documents below to discover your deadlines." />}</section>
      <section className="glass-feature rounded-xl border border-indigo-100 bg-indigo-50/60 p-5"><p className="flex items-center gap-2 text-xs font-semibold text-indigo-700"><Sparkles className="size-4" />ACADEMIC INSIGHTS</p><h2 className="mt-5 text-lg font-semibold tracking-tight">{exam ? "A little preparation goes a long way." : "Make room for the learning."}</h2><p className="mt-3 text-sm leading-relaxed text-zinc-600">{exam ? `Your ${exam.course} ${exam.title} is ${daysLabel(daysUntil(exam.dueDate)).toLowerCase()}. Generate a guide from your course materials and focus your study time.` : "Add your syllabus and notes. Your copilot will organize dates and help you prepare for your next exam."}</p>{week.length > 0 && <p className="mt-4 rounded-lg bg-white/80 p-3 text-xs text-indigo-700">{week.length} deadline{week.length === 1 ? "" : "s"} in the next 7 days.</p>}<button disabled={!canRun} onClick={onRun} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 disabled:opacity-40">Prepare with Copilot <ArrowRight className="size-4" /></button></section>
    </div>
    <section className="glass-panel rounded-xl border border-zinc-200 bg-white p-5"><h2 className="mb-4 text-sm font-semibold">Recent activity {demoMode && <span className="ml-2 text-[10px] font-normal text-amber-700">Demo workspace</span>}</h2>{activities.length ? <ul className="space-y-4">{activities.map(a => <li key={a.id} className="flex items-start gap-3"><CheckCheck className="mt-0.5 size-4 text-indigo-400" /><p className="flex-1 text-xs text-zinc-600">{a.message}</p><time className="text-[10px] text-zinc-400">{a.time}</time></li>)}</ul> : <p className="text-xs text-zinc-400">Confirmed activity from this session will appear here.</p>}</section>
  </>;
}

export function Courses({ events, onSelect }: { events: AcademicEvent[]; onSelect: (course: string) => void }) {
  const courses = [...new Set(events.map(e => e.course))];
  return courses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course, i) => {
    const upcoming = events.filter(e => e.course === course && (daysUntil(e.dueDate) ?? -1) >= 0);
    return <article key={course} className="glass-panel rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"><div className={cx("mb-6 inline-flex rounded-xl p-3", ["bg-indigo-50 text-indigo-500", "bg-teal-50 text-teal-600", "bg-orange-50 text-orange-500"][i % 3])}><GraduationCap className="size-6" /></div><h2 className="text-lg font-semibold tracking-tight">{course}</h2><p className="mt-2 text-xs text-zinc-500">{upcoming.length} upcoming event{upcoming.length === 1 ? "" : "s"}</p><div className="my-5 border-y border-zinc-100 py-4"><p className="text-[10px] uppercase tracking-wide text-zinc-400">Next deadline</p><p className="mt-2 text-sm font-medium">{upcoming[0]?.title ?? "All caught up"}</p>{upcoming[0] && <p className="mt-1 text-xs text-zinc-500">{formatDueDate(upcoming[0].dueDate)}</p>}</div><button onClick={() => onSelect(course)} className="flex items-center gap-2 text-xs font-semibold text-indigo-600">View course deadlines <ArrowRight className="size-3" /></button></article>;
  })}</div> : <EmptyState title="Your courses, together" description="Courses appear automatically when your syllabus returns academic events." />;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="glass-inset rounded-xl border border-dashed border-zinc-200 bg-white/70 px-6 py-10 text-center"><BookOpen className="mx-auto mb-3 size-6 text-indigo-300" /><p className="text-sm font-semibold text-zinc-700">{title}</p><p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{description}</p></div>;
}
