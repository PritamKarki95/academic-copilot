"use client";

import { CalendarClock, ListChecks, NotebookPen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AGENT_STEPS, AgentSection, type AgentPhase } from "@/components/AgentSection";
import { DeadlinesSection } from "@/components/DeadlinesSection";
import { Header } from "@/components/Header";
import { QuizSection } from "@/components/QuizSection";
import { StudyGuideSection } from "@/components/StudyGuideSection";
import { UploadSection } from "@/components/UploadSection";
import { ApiError, generateQuiz, runAgent, uploadDocuments } from "@/lib/api";
import { daysUntil } from "@/lib/dates";
import { DEMO_AGENT_RESULT, DEMO_FILE_NAMES, demoUploadResult } from "@/lib/demo-data";
import type { Quiz, StudyGuide, UploadResult } from "@/lib/types";

// DEMO_MODE default comes from the env; the header toggle switches it at runtime.
const DEMO_MODE_DEFAULT = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type UiError = { message: string; detail?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toUiError(err: unknown): UiError {
  if (err instanceof ApiError) return { message: err.message, detail: err.detail };
  return { message: "Something went wrong.", detail: err instanceof Error ? err.message : String(err) };
}

export default function Home() {
  const [demoMode, setDemoMode] = useState(DEMO_MODE_DEFAULT);

  // Step 1 — upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "done">("idle");
  const [uploadError, setUploadError] = useState<UiError | null>(null);
  const [upload, setUpload] = useState<UploadResult | null>(null);

  // Step 3 — agent
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [agentError, setAgentError] = useState<UiError | null>(null);

  // Steps 4–5 — results
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
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

  // Smoothly bring each newly revealed section into view.
  useEffect(() => {
    if (upload) deadlinesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [upload]);
  useEffect(() => {
    if (agentPhase === "running") agentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [agentPhase]);
  useEffect(() => {
    if (guide) guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [guide]);

  useEffect(() => () => stopStepTimer(), []);

  function stopStepTimer() {
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = null;
  }

  function setStep(i: number) {
    activeStepRef.current = i;
    setActiveStep(i);
  }

  function resetAll() {
    runId.current++;
    stopStepTimer();
    setFiles([]);
    setUploadStatus("idle");
    setUploadError(null);
    setUpload(null);
    setAgentPhase("idle");
    setStep(0);
    setFailedStep(null);
    setAgentError(null);
    setGuide(null);
    setQuiz(null);
    setQuizLoading(false);
    setQuizError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeMode(demo: boolean) {
    if (demo === demoMode) return;
    resetAll();
    setDemoMode(demo);
  }

  // ── Step 1: upload & extract deadlines ──────────────────────────────────
  async function handleAnalyze() {
    const id = ++runId.current;
    setUploadStatus("loading");
    setUploadError(null);
    try {
      let result: UploadResult;
      if (demoMode) {
        await sleep(1600);
        result = demoUploadResult();
      } else {
        if (!files.length) throw new ApiError("Please add at least one PDF.");
        result = await uploadDocuments(files);
      }
      if (id !== runId.current) return;
      setUpload(result);
      setUploadStatus("done");
    } catch (err) {
      if (id !== runId.current) return;
      setUploadError(toUiError(err));
      setUploadStatus("idle");
    }
  }

  // ── Step 3: run the agent (study guide + quiz) ──────────────────────────
  async function handleRunAgent() {
    if (!upload) return;
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
      if (demoMode) {
        await sleep(AGENT_STEPS.length * 1100 + 400);
        if (id !== runId.current) return;
        stopStepTimer();
        setGuide(DEMO_AGENT_RESULT.studyGuide);
        setQuiz(DEMO_AGENT_RESULT.quiz);
        setAgentPhase("done");
        return;
      }

      const result = await runAgent({ sessionId: upload.sessionId, events: upload.events });
      if (id !== runId.current) return;

      if (result.quiz) {
        stopStepTimer();
        setGuide(result.studyGuide);
        setQuiz(result.quiz);
        setAgentPhase("done");
        return;
      }

      // Guide arrived without a quiz → request it separately.
      setStep(AGENT_STEPS.length - 1);
      try {
        const q = await generateQuiz({ sessionId: upload.sessionId, events: upload.events, studyGuide: result.studyGuide });
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
    } catch (err) {
      if (id !== runId.current) return;
      stopStepTimer();
      setFailedStep(activeStepRef.current);
      setAgentError(toUiError(err));
      setAgentPhase("error");
    }
  }

  async function retryQuiz() {
    if (!upload || !guide || demoMode) return;
    const id = runId.current;
    setQuizLoading(true);
    setQuizError(null);
    try {
      const q = await generateQuiz({ sessionId: upload.sessionId, events: upload.events, studyGuide: guide });
      if (id !== runId.current) return;
      setQuiz(q);
      setFailedStep(null);
    } catch (err) {
      if (id !== runId.current) return;
      setQuizError(toUiError(err));
    } finally {
      if (id === runId.current) setQuizLoading(false);
    }
  }

  const nextExam = upload?.events.find((e) => e.type === "exam" && (daysUntil(e.dueDate) ?? 0) >= 0);
  const showQuiz = agentPhase === "done" && (quiz || quizError || quizLoading);

  return (
    <div className="min-h-screen">
      <Header
        demoMode={demoMode}
        onModeChange={changeMode}
        canReset={uploadStatus !== "idle" || files.length > 0 || !!upload}
        onReset={resetAll}
        busy={busy}
      />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <div className="animate-fade-up mb-10 text-center">
          <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <Sparkles className="size-3.5" />
            Agentic AI for students
          </p>
          <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-[42px] sm:leading-[1.1]">
            From syllabus to study plan,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">automatically.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-zinc-500">
            Upload your course documents. Academic Copilot finds every deadline, then builds a study guide and practice quiz
            for your next exam.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-zinc-600">
            {[
              { icon: CalendarClock, label: "Deadlines" },
              { icon: NotebookPen, label: "Study guides" },
              { icon: ListChecks, label: "Practice quizzes" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                <Icon className="size-3.5 text-violet-500" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <UploadSection
            files={files}
            onFilesChange={setFiles}
            demoMode={demoMode}
            status={uploadStatus}
            error={uploadError}
            onAnalyze={handleAnalyze}
            demoFileNames={DEMO_FILE_NAMES}
          />

          {upload && <DeadlinesSection ref={deadlinesRef} events={upload.events} demoMode={demoMode} />}

          {upload && upload.events.length > 0 && (
            <AgentSection
              ref={agentRef}
              phase={agentPhase}
              activeStep={activeStep}
              failedStep={failedStep}
              error={agentError}
              demoMode={demoMode}
              focusLabel={nextExam?.title}
              onRun={handleRunAgent}
            />
          )}

          {guide && agentPhase === "done" && <StudyGuideSection ref={guideRef} guide={guide} demoMode={demoMode} />}

          {showQuiz && (
            <QuizSection ref={quizRef} quiz={quiz} loading={quizLoading} error={quizError} onRetry={retryQuiz} demoMode={demoMode} />
          )}
        </div>
      </main>
    </div>
  );
}
