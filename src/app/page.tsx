"use client";

import { Sparkles } from "lucide-react";
import { Courses, DashboardShell, EmptyState, Overview, VIEWS, type Activity, type View } from "@/components/Dashboard";
import { useEffect, useRef, useState } from "react";
import { AGENT_STEPS, AgentSection, type AgentPhase } from "@/components/AgentSection";
import { DeadlinesSection } from "@/components/DeadlinesSection";
import { Header } from "@/components/Header";
import { QuizSection } from "@/components/QuizSection";
import { StudyGuideSection } from "@/components/StudyGuideSection";
import { UploadSection } from "@/components/UploadSection";
import { ApiError } from "@/lib/api";
import { academicService } from "@/lib/service";
import { daysUntil } from "@/lib/dates";
import { DEMO_AGENT_RESULT, DEMO_FILE_NAMES, demoUploadResult } from "@/lib/demo-data";
import type { Quiz, StudyGuide, UploadResult } from "@/lib/types";

// DEMO_MODE default comes from the env; the header toggle switches it at runtime.
const DEMO_MODE_DEFAULT = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type UiError = { message: string; detail?: string };

function toUiError(err: unknown): UiError {
  if (err instanceof ApiError) return { message: err.message, detail: err.detail };
  return { message: "Something went wrong.", detail: err instanceof Error ? err.message : String(err) };
}

export default function Home() {
  const [demoMode, setDemoMode] = useState(DEMO_MODE_DEFAULT);
  const [view, setView] = useState<View>("overview");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [readCount, setReadCount] = useState(0);
  const activityId = useRef(0);

  function navigate(next: View) {
    setView(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function record(message: string) {
    const activity = { id: ++activityId.current, message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setActivities(a => [activity, ...a].slice(0, 20));
  }

  useEffect(() => {
    function syncView() {
      const target = window.location.hash.slice(1);
      if (VIEWS.some(v => v.id === target)) setView(target as View);
    }
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  // Step 1 — upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "done">("idle");
  const [uploadError, setUploadError] = useState<UiError | null>(null);
  const [upload, setUpload] = useState<UploadResult | null>(() => DEMO_MODE_DEFAULT ? demoUploadResult() : null);

  // Step 3 — agent
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [agentError, setAgentError] = useState<UiError | null>(null);

  // Steps 4–5 — results
  const [guide, setGuide] = useState<StudyGuide | null>(DEMO_MODE_DEFAULT ? DEMO_AGENT_RESULT.studyGuide : null);
  const [quiz, setQuiz] = useState<Quiz | null>(DEMO_MODE_DEFAULT ? DEMO_AGENT_RESULT.quiz : null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<UiError | null>(null);

  // Each run gets an id so results from a run that was reset are ignored.
  const runId = useRef(0);
  const activeStepRef = useRef(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const deadlinesRef = useRef<HTMLElement>(null);
  const agentRef = useRef<HTMLElement>(null);
  const guideRef = useRef<HTMLElement>(null);
  const quizRef = useRef<HTMLElement>(null);

  const busy = uploadStatus === "loading" || agentPhase === "running" || quizLoading;
  const service = academicService(demoMode);

  useEffect(() => () => stopStepTimer(), []);

  function stopStepTimer() {
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = null;
  }

  function setStep(i: number) {
    activeStepRef.current = i;
    setActiveStep(i);
  }

  function resetAll(demo = demoMode) {
    runId.current++;
    stopStepTimer();
    setFiles([]);
    setUploadStatus("idle");
    setUploadError(null);
    setUpload(demo ? demoUploadResult() : null);
    setAgentPhase("idle");
    setStep(0);
    setFailedStep(null);
    setAgentError(null);
    setGuide(demo ? DEMO_AGENT_RESULT.studyGuide : null);
    setQuiz(demo ? DEMO_AGENT_RESULT.quiz : null);
    setActivities([]);
    setReadCount(0);
    setCourseFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
    navigate("overview");
    setQuizLoading(false);
    setQuizError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeMode(demo: boolean) {
    if (demo === demoMode) return;
    resetAll(demo);
    setDemoMode(demo);
  }

  // ── Step 1: upload & extract deadlines ──────────────────────────────────
  async function handleAnalyze() {
    if (busy) return;
    const id = ++runId.current;
    setUploadStatus("loading");
    setUploadError(null);
    try {
      if (!demoMode && !files.length) throw new ApiError("Please add at least one PDF.");
      const result = await service.uploadDocuments(files);
      if (id !== runId.current) return;
      setUpload(result);
      setUploadStatus("done");
      setGuide(null);
      setQuiz(null);
      setAgentPhase("idle");
      record((demoMode ? "Demo: loaded " : "Extracted ") + result.events.length + (demoMode ? " deadlines from sample data." : " deadlines from uploaded documents."));
    } catch (err) {
      if (id !== runId.current) return;
      setUploadError(toUiError(err));
      setUploadStatus("idle");
    }
  }

  // ── Step 3: run the agent (study guide + quiz) ──────────────────────────
  async function handleRunAgent() {
    if (!upload || busy) return;
    const id = ++runId.current;
    setAgentPhase("running");
    setAgentError(null);
    setFailedStep(null);
    setGuide(null);
    setQuiz(null);
    setQuizError(null);
    setStep(0);

    // Visual walkthrough of the workflow. It holds on the last step until the
    // real response arrives; nothing is marked complete before that.
    stopStepTimer();
    stepTimer.current = setInterval(
      () => {
        if (activeStepRef.current < AGENT_STEPS.length - 1) setStep(activeStepRef.current + 1);
      },
      demoMode ? 1100 : 1600,
    );

    try {
      const result = await service.runAgent({ sessionId: upload.sessionId, events: upload.events });
      if (id !== runId.current) return;

      if (result.quiz) {
        stopStepTimer();
        setGuide(result.studyGuide);
        setQuiz(result.quiz);
        setAgentPhase("done");
        record(demoMode ? "Demo: simulated study guide and quiz are ready." : "Study guide and quiz received from the backend.");
        return;
      }

      // Guide arrived without a quiz → request it separately.
      setStep(AGENT_STEPS.length - 1);
      try {
        const q = await service.generateQuiz({ sessionId: upload.sessionId, events: upload.events, studyGuide: result.studyGuide });
        if (id !== runId.current) return;
        setQuiz(q);
      } catch (err) {
        if (id !== runId.current) return;
        setQuizError(toUiError(err));
        setFailedStep(AGENT_STEPS.length - 1);
      }
      stopStepTimer();
      setGuide(result.studyGuide);
      setAgentPhase("done");
      record("Study guide received from the backend.");
    } catch (err) {
      if (id !== runId.current) return;
      stopStepTimer();
      setFailedStep(null);
      setAgentError(toUiError(err));
      setAgentPhase("error");
      record("Agent request failed. Retry is available.");
    }
  }

  async function retryQuiz() {
    if (!upload || !guide || demoMode) return;
    const id = runId.current;
    setQuizLoading(true);
    setQuizError(null);
    try {
      const q = await service.generateQuiz({ sessionId: upload.sessionId, events: upload.events, studyGuide: guide });
      if (id !== runId.current) return;
      setQuiz(q);
      setFailedStep(null);
      record("Practice quiz received from the backend.");
    } catch (err) {
      if (id !== runId.current) return;
      setQuizError(toUiError(err));
    } finally {
      if (id === runId.current) setQuizLoading(false);
    }
  }

  const events = upload?.events ?? [];
  const nextExam = events.find(e => e.type === "exam" && (daysUntil(e.dueDate) ?? -1) >= 0);
  const filteredEvents = events.filter(e => {
    const days = daysUntil(e.dueDate);
    return (courseFilter === "all" || e.course === courseFilter)
      && (typeFilter === "all" || e.type === typeFilter)
      && (dateFilter === "all" || (dateFilter === "upcoming" ? days !== null && days >= 0 : days !== null && days < 0));
  });
  const alerts = events.filter(e => { const d = daysUntil(e.dueDate); return d !== null && d >= 0 && d <= 7; })
    .map(e => e.title + " (" + e.course + ") is due " + e.dueDate + ".");
  const notifications = [...activities.map(a => a.message), ...alerts];
  const canRun = !!events.length && !busy;
  const heading = {
    overview: ["Your next chapter, organized.", "Less time tracking deadlines. More time understanding what matters."],
    courses: ["Your courses", "One home for every course, exam, and assignment."],
    deadlines: ["Every deadline. A little more clarity.", "See what's coming and choose where to focus."],
    guides: ["Make your next study session count.", "Focused guides built from your course materials."],
    quizzes: ["Turn understanding into confidence.", "Practice your material, check your answers, and try again."],
  }[view];

  const runner = upload && events.length > 0 ? <AgentSection ref={agentRef} phase={agentPhase} activeStep={activeStep} failedStep={failedStep} error={agentError} demoMode={demoMode} focusLabel={nextExam?.title} onRun={handleRunAgent} /> : null;

  return <DashboardShell view={view} navigate={navigate} demoMode={demoMode} busy={busy} canRun={canRun} onRun={() => { navigate("overview"); void handleRunAgent(); }} notifications={notifications} unread={(activities[0]?.id ?? 0) + alerts.length > readCount} onRead={() => setReadCount((activities[0]?.id ?? 0) + alerts.length)}
    header={<Header demoMode={demoMode} onModeChange={changeMode} canReset={uploadStatus !== "idle" || files.length > 0 || !!upload} onReset={() => resetAll()} busy={busy} />}>
    <div className="animate-fade-up"><p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600"><Sparkles className="size-3" /> Your academic copilot</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading[0]}</h1><p className="mt-2 text-sm text-zinc-500">{heading[1]}</p></div>

    {view === "overview" && <>
      <Overview events={events} guide={guide} activities={activities} demoMode={demoMode} canRun={canRun} onRun={handleRunAgent} onDeadlines={() => navigate("deadlines")} />
      <UploadSection disabled={busy} key={String(demoMode)} files={files} onFilesChange={setFiles} demoMode={demoMode} status={uploadStatus} error={uploadError} onAnalyze={handleAnalyze} demoFileNames={DEMO_FILE_NAMES} />
      {runner}
      {guide && agentPhase === "done" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5" role="status"><p className="text-sm font-medium text-emerald-800">Your study guide is ready{quiz ? ", along with your practice quiz" : ""}.</p><button onClick={() => navigate("guides")} className="text-sm font-semibold text-indigo-700">Open study guide →</button></div>}
    </>}

    {view === "courses" && <Courses events={events} onSelect={course => { setCourseFilter(course); setTypeFilter("all"); setDateFilter("all"); navigate("deadlines"); }} />}

    {view === "deadlines" && <>
      <div className="glass-panel glass-filters flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-zinc-500">Course<select className="min-w-40 rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-800" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}><option value="all">All courses</option>{[...new Set(events.map(e => e.course))].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-zinc-500">Event type<select className="min-w-36 rounded-lg border border-zinc-200 bg-white p-2 text-sm capitalize text-zinc-800" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">All types</option>{["exam", "assignment", "presentation", "quiz", "project", "other"].map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-zinc-500">Due date<select className="min-w-36 rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-800" value={dateFilter} onChange={e => setDateFilter(e.target.value)}><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="overdue">Past due</option></select></label>
        <button className="self-end rounded-lg px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => { setCourseFilter("all"); setTypeFilter("all"); setDateFilter("all"); }}>Clear filters</button>
      </div>
      {filteredEvents.length ? <DeadlinesSection ref={deadlinesRef} events={filteredEvents} demoMode={demoMode} /> : <EmptyState title={events.length ? "No deadlines match these filters" : "No deadlines yet"} description={events.length ? "Try a different course, event type, or date range." : "Upload your syllabus in Overview, or switch to Demo to explore sample deadlines."} />}
    </>}

    {view === "guides" && (guide ? <><StudyGuideSection ref={guideRef} guide={guide} demoMode={demoMode} /><button onClick={() => navigate("quizzes")} className="glass-primary rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Practice this material →</button></> : <><EmptyState title="Your study guide starts here" description="Upload a syllabus and notes, then run the agent from Overview to prepare your materials." />{runner}</>)}

    <div hidden={view !== "quizzes"}>
      {quiz || quizError || quizLoading ? <QuizSection ref={quizRef} quiz={quiz} loading={quizLoading} error={quizError} onRetry={retryQuiz} demoMode={demoMode} /> : <EmptyState title="A little practice goes a long way" description="Run the agent after uploading your materials to generate a practice quiz." />}
    </div>
    <p className="sr-only" role="status">{activities[0]?.message}</p>
  </DashboardShell>;
}
