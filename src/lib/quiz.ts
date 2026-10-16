import type { Quiz } from "./types";

export function quizScore(quiz: Quiz, answers: Record<string, number>) {
  const total = quiz.questions.length;
  const answered = quiz.questions.filter(q => Number.isInteger(answers[q.id]) && answers[q.id] >= 0 && answers[q.id] < q.options.length).length;
  const score = quiz.questions.filter(q => answers[q.id] === q.correctIndex).length;
  return { total, answered, score, percent: total ? Math.round(score / total * 100) : 0 };
}
