
from datetime import date
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv()

client = genai.Client()


class AcademicEvent(BaseModel):
    title: str
    type: Literal["exam", "assignment", "presentation", "other"]
    due_date: date | None
    description: str | None


class DeadlineResult(BaseModel):
    course: str
    events: list[AcademicEvent]


def extract_deadlines(syllabus_text: str) -> dict:
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=(
            "Extract academic events from the syllabus below. "
            "Include exams, assignment deadlines, and presentations. "
            "Use the academic year stated in the syllabus. "
            "Never invent dates. Use null if a date is unknown. "
            "Include past and future events.\n\n"
            f"SYLLABUS:\n{syllabus_text}"
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DeadlineResult,
            temperature=0
        )
    )

    if not response.text:
        raise ValueError("Gemini returned no structured response")

    result = DeadlineResult.model_validate_json(response.text)
    return result.model_dump(mode="json")
