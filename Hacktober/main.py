
from fastapi import FastAPI, UploadFile, File, HTTPException
from services.pdf_service import extract_pdf_text
from pydantic import BaseModel
from fastapi.concurrency import run_in_threadpool
from agents.deadline_agent import extract_deadlines
from agents.study_agent import generate_study_material
from fastapi.middleware.cors import CORSMiddleware
from datetime import date

app = FastAPI(title="Academic Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)



@app.post("/upload")
async def upload_documents(
    syllabus: UploadFile = File(...),
    notes: UploadFile = File(...)
):
    documents = [syllabus, notes]

    results = {
        "syllabus": {},
        "notes": []
    }

    for index, document in enumerate(documents):
        if not document.filename or not document.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )

        content = await document.read()

        try:
            text = extract_pdf_text(content)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot process {document.filename}"
            )

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail=f"No readable text found in {document.filename}"
            )

        extracted = {
            "filename": document.filename,
            "text": text,
            "characters": len(text)
        }

        if index == 0:
            results["syllabus"] = extracted
        else:
            results["notes"].append(extracted)

    return results



class SyllabusRequest(BaseModel):
    text: str


@app.post("/extract-deadlines")
async def extract_syllabus_deadlines(request: SyllabusRequest):
    return await run_in_threadpool(
        extract_deadlines,
        request.text
    )



@app.post("/analyze")
async def analyze_documents(
    syllabus: UploadFile = File(...),
    notes: UploadFile = File(...)
):
    documents = {}

    for name, uploaded_file in [
        ("syllabus", syllabus),
        ("notes", notes)
    ]:
        if not uploaded_file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"{name} must be a PDF"
            )

        pdf_bytes = await uploaded_file.read()

        try:
            text = extract_pdf_text(pdf_bytes)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read {name} PDF"
            )

        documents[name] = text

    if not documents["syllabus"].strip():
        raise HTTPException(
            status_code=422,
            detail="Syllabus has no readable text"
        )


    try:
        deadlines = await run_in_threadpool(
            extract_deadlines,
            documents["syllabus"]
        )

        study_material = None

        if documents["notes"].strip():
            study_material = await run_in_threadpool(
                generate_study_material,
                documents["notes"]
            )


    except Exception as e:

        print(f"AI ERROR: {type(e).__name__}: {e}")

        raise HTTPException(

            status_code=502,

            detail="AI processing failed"

        )

    today = date.today().isoformat()

    upcoming_events = sorted(
        [
            event
            for event in deadlines["events"]
            if event["due_date"] is not None
               and event["due_date"] >= today
        ],
        key=lambda event: event["due_date"]
    )

    return {
        "course": deadlines["course"],
        "events": upcoming_events,
        "study_guide": study_material
    }


class StudyRequest(BaseModel):
    notes_text: str


@app.post("/generate-study-guide")
async def generate_study_guide(request: StudyRequest):
    if not request.notes_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Lecture notes cannot be empty"
        )

    try:
        return await run_in_threadpool(
            generate_study_material,
            request.notes_text
        )
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI study material generation failed"
        )

