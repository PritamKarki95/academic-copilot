
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=(
        "Extract the academic deadline from this text: "
        "Speech 3 Outline due October 30, 2026 at 11:59 PM. "
        "Return the event name and date."
    )
)

print(response.text)
