# Academic Copilot — Frontend

One-page Next.js demo: upload a syllabus + notes → see deadlines → run the agent → read the study guide → take the quiz.

## Run it

```bash
npm install
cp .env.example .env.local   # already done if .env.local exists
npm run dev                  # http://localhost:3000
```

**Demo vs Live**
- Use the **Live / Demo** toggle in the header. Switching resets the page.
- **Demo** uses built-in sample data. It's labeled everywhere (yellow banner + "Sample data" badges). No backend is called.
- **Live** calls the backend at `NEXT_PUBLIC_API_BASE_URL`. If a request fails you see the real error with a Retry button. It never falls back to sample data.
- To start in Demo by default, set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` and restart.

**No backend yet?** `npm run mock` starts a tiny stand-in on port 8000.
`MODE=separate npm run mock` returns the quiz from `/quizzes/generate`; `MODE=fail-agent npm run mock` tests the error state.

## Backend checklist (for the FastAPI side)

1. Enable CORS for `http://localhost:3000`:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
   ```
2. Return the JSON shapes below. Dates as `YYYY-MM-DD`.

### `POST /upload`
Multipart form, field name `files` (repeated once per PDF).

```json
{
  "session_id": "abc123",
  "events": [
    { "id": "e1", "course": "CS 201", "title": "Midterm Exam", "type": "exam", "due_date": "2026-10-25", "weight": "25%" }
  ]
}
```
`type` is one of `exam | assignment | quiz | project | other`. `session_id`, `id`, `weight` are optional.

### `POST /agent/run`
Request body (JSON):
```json
{ "session_id": "abc123", "events": [ /* the events from /upload */ ] }
```
Response:
```json
{
  "study_guide": {
    "title": "Midterm Exam Study Guide",
    "course": "CS 201",
    "focus": "Midterm Exam",
    "summary": "One paragraph overview.",
    "sections": [ { "heading": "Hash Tables", "points": ["...", "..."] } ],
    "key_terms": [ { "term": "Load factor", "definition": "..." } ]
  },
  "quiz": {
    "title": "Practice Quiz",
    "questions": [
      { "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "..." }
    ]
  }
}
```
`quiz` is optional. If it's missing, the frontend calls `/quizzes/generate`.

### `POST /quizzes/generate` (optional)
Request: `{ "session_id", "events", "study_guide", "num_questions": 5 }` → Response: `{ "quiz": { ...same shape as above } }`

## Changing the contract

All backend details live in **`src/lib/api.ts`**: base URL, endpoint paths, upload field name, timeouts, and the functions that map responses into the UI types. The mappers already accept common variants (`dueDate`/`due_date`/`date`, `options`/`choices`, `correct_index` as a number, a letter like `"B"`, or the answer text). If the backend shape differs, edit the matching `map*` function there.

## Files

```
src/app/page.tsx              page + all state (upload → agent → quiz)
src/lib/api.ts                API adapter (edit this to match the backend)
src/lib/demo-data.ts          Demo mode sample data
src/lib/types.ts              shared types
src/components/*              Header, Upload, Deadlines, Agent, StudyGuide, Quiz, ui
mock-backend/server.mjs       stand-in backend for testing Live mode
```

Note on the agent steps: the five steps are a visual overview of the workflow. In Live mode they cycle while the request is pending, and they only turn green after the backend actually responds.
