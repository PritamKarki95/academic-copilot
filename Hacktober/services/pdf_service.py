
import pymupdf


def extract_pdf_text(pdf_bytes: bytes) -> str:
    with pymupdf.open(
        stream=pdf_bytes,
        filetype="pdf"
    ) as document:

        pages = []

        for page in document:
            text = page.get_text().strip()

            if text:
                pages.append(text)

        return "\n\n".join(pages)
