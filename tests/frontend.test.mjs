import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nativeRequire = createRequire(import.meta.url);

// Load the actual TypeScript modules in an isolated context, without a second
// compiler configuration or an additional test-runner dependency.
function load(relative, overrides = {}) {
  const filename = resolve(root, relative);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, process: { env: {} }, setTimeout, clearTimeout, AbortController,
    FormData, fetch, Date, ...overrides,
    require: spec => {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) return nativeRequire(spec);
      const base = spec.startsWith("@/") ? resolve(root, "src", spec.slice(2)) : resolve(dirname(filename), spec);
      return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`, overrides);
    },
  }, { filename });
  return exports;
}

test("dates reject missing and impossible dates; date-only values retain the calendar day", () => {
  const dates = load("src/lib/dates.ts");
  for (const value of ["", "not a date", "2026-02-30", "2026-13-01", "2026-00-10", "2026-10-16garbage", "2026-10-16Tbad"]) {
    assert.equal(dates.parseDueDate(value), null, value);
  }
  const date = dates.parseDueDate("2026-10-16");
  assert.equal(date.getDate(), 16);
  assert.equal(date.getMonth(), 9);
  assert.equal(dates.daysUntil("2026-03-09", new Date(2026, 2, 7)), 2);
  assert.ok(dates.parseDueDate("2028-02-29"));
});

test("event adapter accepts variants, excludes invalid dates, and sorts chronologically", () => {
  const api = load("src/lib/api.ts");
  const result = api.mapUploadResponse({ session_id: "abc", events: [
    { name: "Presentation", course_name: "ENG 210", date: "2026-10-25", event_type: "presentation" },
    { title: "Homework", course: "CS 201", dueDate: "2026-10-20" },
    { title: "Impossible", due_date: "2026-02-30" },
    { title: "Undated" },
  ] });
  assert.equal(result.sessionId, "abc");
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].title, "Homework");
  assert.equal(result.events[1].type, "presentation");
  assert.throws(() => api.mapUploadResponse({ success: true }), /events list/);
});

test("guide adapter supports structured guides and Markdown; quiz answers must be supplied", () => {
  const api = load("src/lib/api.ts");
  const result = api.mapAgentResponse({ study_guide: { title: "Guide", content: "## Hashing\n- **Practice** lookups", exam_date: "2026-10-25" }, quiz: { questions: [
    { id: "duplicate", question: "Letter?", choices: ["Alpha", "Beta"], answer: "B" },
    { id: "duplicate", question: "Text?", options: ["Alpha", "Beta"], correct_answer: "Alpha" },
    { question: "Numeric?", options: ["Alpha", "Beta"], correct_index: 1 },
    { question: "Unknown?", options: ["Alpha", "Beta"] },
    { question: "Fractional?", options: ["Alpha", "Beta"], correct_index: 0.5 },
  ] } });
  assert.match(result.studyGuide.content, /## Hashing/);
  assert.equal(result.studyGuide.examDate, "2026-10-25");
  assert.equal(result.quiz.questions.length, 3);
  assert.equal(new Set(result.quiz.questions.map(q => q.id)).size, 3);
  assert.equal(result.quiz.questions[0].correctIndex, 1);
  assert.equal(result.quiz.questions[1].correctIndex, 0);
  assert.equal(api.mapAgentResponse({ study_guide: "# Plain Markdown" }).quiz, null);
  assert.throws(() => api.mapAgentResponse({ quiz: {} }), /study guide/);
});

test("upload uses repeated files multipart fields; agent posts the README contract", async () => {
  const calls = [];
  const api = load("src/lib/api.ts", { fetch: async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(url.endsWith("/upload") ? { session_id: "abc", events: [] } : { study_guide: "A guide" }), { status: 200 });
  } });
  await api.uploadDocuments([new File(["%PDF"], "syllabus.pdf", { type: "application/pdf" }), new File(["%PDF"], "notes.pdf", { type: "application/pdf" })]);
  assert.equal(calls[0].url, "http://localhost:8000/upload");
  assert.equal(calls[0].init.body.getAll("files").length, 2);
  assert.equal(calls[0].init.headers, undefined);
  await api.runAgent({ sessionId: "abc", events: [{ id: "e1", title: "Exam", course: "CS 201", type: "exam", dueDate: "2026-10-25" }] });
  const body = JSON.parse(calls[1].init.body);
  assert.equal(body.session_id, "abc");
  assert.equal(body.events[0].due_date, "2026-10-25");
});

test("network and backend failures surface errors without sample-data fallback", async () => {
  const failed = load("src/lib/api.ts", { fetch: async () => new Response(JSON.stringify({ detail: "LLM timeout" }), { status: 500 }) });
  await assert.rejects(failed.runAgent({ events: [] }), error => error.detail === "LLM timeout" && /HTTP 500/.test(error.message));
  const offline = load("src/lib/api.ts", { fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(offline.uploadDocuments([]), /Couldn't reach the backend/);
});

test("separate quiz endpoint includes guide context and rejects unscorable questions", async () => {
  let sent;
  const api = load("src/lib/api.ts", { fetch: async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ quiz: { questions: [{ question: "Missing answer", options: ["A", "B"] }] } }));
  } });
  await assert.rejects(api.generateQuiz({ sessionId: "abc", events: [], studyGuide: { title: "Guide" } }), /no usable questions/);
  assert.equal(sent.url, "http://localhost:8000/quizzes/generate");
  assert.equal(sent.body.num_questions, 5);
  assert.equal(sent.body.study_guide.title, "Guide");
});

test("demo has three courses, two exams, and five scorable quiz questions", async () => {
  const { demoUploadResult, DEMO_AGENT_RESULT } = load("src/lib/demo-data.ts");
  const events = demoUploadResult().events;
  assert.equal(new Set(events.map(e => e.course)).size, 3);
  assert.equal(events.filter(e => e.type === "exam").length, 2);
  assert.equal(DEMO_AGENT_RESULT.quiz.questions.length, 5);
  const { academicService } = load("src/lib/service.ts", { fetch: () => { throw new Error("Demo must not fetch"); }, setTimeout: callback => setTimeout(callback, 0) });
  assert.equal((await academicService(true).uploadDocuments([])).events.length, events.length);
  assert.equal((await academicService(true).runAgent({ events })).quiz.questions.length, 5);
});

test("quiz scoring handles partial, perfect, wrong, and invalid selections", () => {
  const { quizScore } = load("src/lib/quiz.ts");
  const { quiz } = load("src/lib/demo-data.ts").DEMO_AGENT_RESULT;
  assert.equal(quizScore(quiz, {}).answered, 0);
  const perfect = Object.fromEntries(quiz.questions.map(q => [q.id, q.correctIndex]));
  assert.equal(quizScore(quiz, perfect).percent, 100);
  assert.equal(quizScore(quiz, { [quiz.questions[0].id]: quiz.questions[0].correctIndex }).percent, 20);
  assert.equal(quizScore(quiz, Object.fromEntries(quiz.questions.map(q => [q.id, (q.correctIndex + 1) % 4]))).score, 0);
  assert.equal(quizScore(quiz, { q1: 999, unknown: 0 }).answered, 0);
});

test("quiz initially renders only its first question and accessible navigation", () => {
  const { QuizSection } = load("src/components/QuizSection.tsx");
  const { quiz } = load("src/lib/demo-data.ts").DEMO_AGENT_RESULT;
  const html = renderToStaticMarkup(createElement(QuizSection, { quiz, loading: false, error: null, onRetry() {}, demoMode: true }));
  assert.ok(html.includes(quiz.questions[0].question));
  assert.ok(!html.includes(quiz.questions[1].question));
  assert.match(html, /Question 1 of 5/);
  assert.match(html, /Previous/);
  assert.match(html, /Next/);
  assert.match(html, /aria-pressed="false"/);
});

test("Markdown renders useful formatting and escapes untrusted HTML", () => {
  const { GuideMarkdown } = load("src/components/GuideMarkdown.tsx");
  const html = renderToStaticMarkup(createElement(GuideMarkdown, { content: "## Focus\n- **Hashing**\n- `O(1)`\n<script>alert(1)</script>\n```\nconst x = 1;\n```" }));
  assert.match(html, /<h3/);
  assert.match(html, /<ul/);
  assert.match(html, /<strong/);
  assert.match(html, /<pre/);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
