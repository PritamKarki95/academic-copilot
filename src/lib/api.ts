// ─────────────────────────────────────────────────────────────────────────────
// Centralized API adapter.
//
// Everything backend-specific lives in this file:
//   • API_CONFIG  → base URL, endpoint paths, upload field name, timeouts
//   • map*()      → convert raw backend JSON into the frontend types
//
// If the backend changes a route or a field name, edit only this file.
// The mappers accept a few common naming variants (snake_case / camelCase,
// wrapped / unwrapped) so small mismatches don't break the demo.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AcademicEvent,
  AgentResult,
  EventType,
  Quiz,
  QuizQuestion,
  StudyGuide,
  UploadResult,
} from "./types";

export const API_CONFIG = {
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, ""),
  endpoints: {
    upload: "/upload",
    agentRun: "/agent/run",
    quizGenerate: "/quizzes/generate",
  },
  uploadField: "files",
  timeoutsMs: {
    upload: 120_000,
    agent: 180_000,
    quiz: 120_000,
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── low-level request helper ────────────────────────────────────────────────

async function request(path: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const url = `${API_CONFIG.baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(
        `The backend took too long to respond (over ${Math.round(timeoutMs / 1000)}s).`,
        `POST ${url}`,
      );
    }
    throw new ApiError(
      `Couldn't reach the backend at ${API_CONFIG.baseUrl}. Is the server running and is CORS enabled?`,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError(`The backend returned a non-JSON response from ${path}.`, text.slice(0, 300));
    }
  }

  if (!res.ok) {
    const detail =
      (isObj(body) && (str(body.detail) || str(body.error) || str(body.message))) || text.slice(0, 300) || res.statusText;
    throw new ApiError(`Request to ${path} failed (HTTP ${res.status}).`, detail);
  }
  return body;
}

// ── public API calls ────────────────────────────────────────────────────────

export async function uploadDocuments(files: File[]): Promise<UploadResult> {
  const form = new FormData();
  for (const f of files) form.append(API_CONFIG.uploadField, f, f.name);
  const raw = await request(API_CONFIG.endpoints.upload, { method: "POST", body: form }, API_CONFIG.timeoutsMs.upload);
  return mapUploadResponse(raw);
}

export async function runAgent(args: { sessionId?: string; events: AcademicEvent[] }): Promise<AgentResult> {
  const raw = await request(
    API_CONFIG.endpoints.agentRun,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: args.sessionId ?? null, events: args.events.map(toBackendEvent) }),
    },
    API_CONFIG.timeoutsMs.agent,
  );
  return mapAgentResponse(raw);
}

export async function generateQuiz(args: {
  sessionId?: string;
  events: AcademicEvent[];
  studyGuide: StudyGuide;
}): Promise<Quiz> {
  const raw = await request(
    API_CONFIG.endpoints.quizGenerate,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: args.sessionId ?? null,
        events: args.events.map(toBackendEvent),
        study_guide: args.studyGuide,
        num_questions: 5,
      }),
    },
    API_CONFIG.timeoutsMs.quiz,
  );
  const quiz = mapQuiz(isObj(raw) && "quiz" in raw ? raw.quiz : raw);
  if (!quiz) throw new ApiError("The quiz endpoint returned no usable questions.", preview(raw));
  return quiz;
}

// ── response mappers ────────────────────────────────────────────────────────

export function mapUploadResponse(raw: unknown): UploadResult {
  const list = Array.isArray(raw)
    ? raw
    : isObj(raw)
      ? (raw.events ?? raw.deadlines ?? raw.items ?? (isObj(raw.data) ? raw.data.events : raw.data))
      : undefined;

  if (!Array.isArray(list)) {
    throw new ApiError("The upload response didn't include an events list.", preview(raw));
  }

  const events = list
    .map((e, i) => mapEvent(e, i))
    .filter((e): e is AcademicEvent => e !== null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const sessionId = isObj(raw)
    ? str(raw.session_id) || str(raw.sessionId) || str(raw.upload_id) || str(raw.document_id) || undefined
    : undefined;

  return { events, sessionId };
}

function mapEvent(e: unknown, i: number): AcademicEvent | null {
  if (!isObj(e)) return null;
  const title = str(e.title) || str(e.name) || str(e.event) || str(e.assignment);
  const dueDate = str(e.due_date) || str(e.dueDate) || str(e.date) || str(e.deadline) || str(e.due);
  if (!title || !dueDate) return null;
  return {
    id: str(e.id) || `evt-${i}`,
    title,
    dueDate,
    course: str(e.course) || str(e.course_name) || str(e.courseName) || str(e.course_code) || "Course",
    type: mapEventType(str(e.type) || str(e.event_type) || str(e.category) || title),
    weight: str(e.weight) || str(e.worth) || undefined,
    sourceFile: str(e.source) || str(e.source_file) || str(e.sourceFile) || undefined,
  };
}

function mapEventType(s: string): EventType {
  const v = s.toLowerCase();
  if (/(exam|midterm|final|test)/.test(v)) return "exam";
  if (/quiz/.test(v)) return "quiz";
  if (/(project|milestone|presentation)/.test(v)) return "project";
  if (/(assign|homework|hw|problem set|pset|lab|essay|paper|report)/.test(v)) return "assignment";
  return "other";
}

export function mapAgentResponse(raw: unknown): AgentResult {
  if (!isObj(raw)) throw new ApiError("The agent returned an unexpected response.", preview(raw));
  const root = isObj(raw.result) ? raw.result : isObj(raw.data) ? raw.data : raw;

  const guideRaw = root.study_guide ?? root.studyGuide ?? root.guide;
  const studyGuide = mapStudyGuide(guideRaw);
  if (!studyGuide) throw new ApiError("The agent response didn't include a study guide.", preview(raw));

  const quiz = mapQuiz(root.quiz ?? root.practice_quiz ?? root.questions);
  return { studyGuide, quiz };
}

function mapStudyGuide(g: unknown): StudyGuide | null {
  // A plain string guide (e.g. markdown) is still shown, as a single section.
  if (typeof g === "string" && g.trim()) {
    return { title: "Study Guide", summary: "", sections: [{ heading: "Overview", points: splitLines(g) }], keyTerms: [] };
  }
  if (!isObj(g)) return null;

  const sectionsRaw = g.sections ?? g.topics ?? [];
  const sections = Array.isArray(sectionsRaw)
    ? sectionsRaw
        .map((s) => {
          if (typeof s === "string") return { heading: s, points: [] };
          if (!isObj(s)) return null;
          const pts = s.points ?? s.bullets ?? s.key_points ?? s.content ?? s.summary;
          return {
            heading: str(s.heading) || str(s.title) || str(s.topic) || "Topic",
            points: Array.isArray(pts) ? pts.map(String) : typeof pts === "string" ? splitLines(pts) : [],
          };
        })
        .filter((s): s is { heading: string; points: string[] } => s !== null)
    : [];

  const termsRaw = g.key_terms ?? g.keyTerms ?? g.glossary ?? [];
  const keyTerms = Array.isArray(termsRaw)
    ? termsRaw
        .map((t) =>
          isObj(t)
            ? { term: str(t.term) || str(t.name), definition: str(t.definition) || str(t.meaning) }
            : typeof t === "string"
              ? { term: t, definition: "" }
              : null,
        )
        .filter((t): t is { term: string; definition: string } => !!t && !!t.term)
    : [];

  const summary = str(g.summary) || str(g.overview) || str(g.description);
  if (!sections.length && !summary) return null;

  return {
    title: str(g.title) || "Study Guide",
    course: str(g.course) || undefined,
    focus: str(g.focus) || str(g.focus_event) || str(g.exam) || undefined,
    summary,
    sections,
    keyTerms,
  };
}

function mapQuiz(q: unknown): Quiz | null {
  const list = Array.isArray(q) ? q : isObj(q) ? q.questions : undefined;
  if (!Array.isArray(list)) return null;

  const questions = list
    .map((item, i): QuizQuestion | null => {
      if (!isObj(item)) return null;
      const optsRaw = item.options ?? item.choices ?? item.answers;
      const options = Array.isArray(optsRaw)
        ? optsRaw.map((o) => (isObj(o) ? str(o.text) || str(o.label) : String(o)))
        : [];
      const question = str(item.question) || str(item.prompt) || str(item.text);
      if (!question || options.length < 2) return null;
      const correctIndex = resolveCorrectIndex(item, options);
      if (correctIndex < 0) return null;
      return {
        id: str(item.id) || `q${i + 1}`,
        question,
        options,
        correctIndex,
        explanation: str(item.explanation) || str(item.rationale) || "",
      };
    })
    .filter((x): x is QuizQuestion => x !== null);

  if (!questions.length) return null;
  return { title: (isObj(q) && str(q.title)) || "Practice Quiz", questions };
}

/** Accepts numeric index, letter ("B"), or the answer text itself. */
function resolveCorrectIndex(item: Record<string, unknown>, options: string[]): number {
  const raw = item.correct_index ?? item.correctIndex ?? item.answer_index ?? item.correct_answer ?? item.answer ?? item.correct;
  if (typeof raw === "number" && raw >= 0 && raw < options.length) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^\d+$/.test(s) && +s < options.length) return +s;
    if (/^[A-Za-z]$/.test(s)) {
      const idx = s.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return idx;
    }
    const byText = options.findIndex((o) => o.trim().toLowerCase() === s.toLowerCase());
    if (byText >= 0) return byText;
  }
  return -1;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function toBackendEvent(e: AcademicEvent) {
  return { id: e.id, course: e.course, title: e.title, type: e.type, due_date: e.dueDate, weight: e.weight ?? null };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function splitLines(s: string): string[] {
  return s
    .split(/\n+/)
    .map((l) => l.replace(/^[\s#>*\-•\d.]+/, "").trim())
    .filter(Boolean);
}

function preview(v: unknown): string {
  try {
    return JSON.stringify(v).slice(0, 300);
  } catch {
    return String(v).slice(0, 300);
  }
}
