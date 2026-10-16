
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv()
client = genai.Client()


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer: int
    explanation: str


class StudyResult(BaseModel):
    title: str
    summary: str
    key_concepts: list[str]
    quiz: list[QuizQuestion]


def generate_study_material(notes_text: str) -> dict:
    if not notes_text.strip():
        raise ValueError("Lecture notes contain no readable text")

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=(
            "You are an academic study assistant.\n"
            "Using ONLY the lecture notes below:\n"
            "1. Generate a concise study guide.\n"
            "2. Identify 5-10 important concepts.\n"
            "3. Generate exactly 5 multiple-choice questions.\n"
            "4. Give exactly 4 options per question.\n"
            "5. correct_answer must be the zero-based index "
            "of the correct option (0-3).\n"
            "6. Explain why the correct answer is correct.\n"
            "Do not introduce unsupported facts.\n\n"
            f"LECTURE NOTES:\n{notes_text}"
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StudyResult,
            temperature=0.3
        )
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response")

    result = StudyResult.model_validate_json(response.text)

    if len(result.quiz) != 5:
        raise ValueError("Expected exactly five quiz questions")

    for question in result.quiz:
        if len(question.options) != 4:
            raise ValueError("Each question must have four options")
        if not 0 <= question.correct_answer < 4:
            raise ValueError("Invalid correct answer index")

    return result.model_dump()
