// Shared frontend types. The API adapter (src/lib/api.ts) maps whatever the
// backend returns into these shapes, so components never see raw responses.

export type EventType = "exam" | "assignment" | "quiz" | "project" | "presentation" | "other";

export interface AcademicEvent {
  id: string;
  course: string;
  title: string;
  type: EventType;
  /** ISO date string, e.g. "2026-10-24" */
  dueDate: string;
  weight?: string;
  sourceFile?: string;
}

export interface UploadResult {
  /** Optional id the backend can hand back so /agent/run knows which docs to use */
  sessionId?: string;
  events: AcademicEvent[];
}

export interface StudyGuideSection {
  heading: string;
  points: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface StudyGuide {
  content?: string;
  examDate?: string;
  title: string;
  course?: string;
  focus?: string;
  summary: string;
  sections: StudyGuideSection[];
  keyTerms: KeyTerm[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface AgentResult {
  studyGuide: StudyGuide;
  /** null when the agent response did not include a quiz */
  quiz: Quiz | null;
}
