# AI Strip — Cartoon Strip Generator

Turn any idea into a cartoon strip using AI.

## Architecture

- **Frontend**: Next.js 14 (React + Tailwind CSS)
- **Backend**: Python FastAPI
- **AI**: Azure OpenAI (GPT-4o + DALL-E 3) — authenticated via Entra ID, no API keys
- **Image Processing**: Pillow (speech bubbles, compositing)

## Quick Start

### Backend

```bash
cd backend
# Edit .env — set AZURE_OPENAI_ENDPOINT to your Azure OpenAI resource URL
# Auth is automatic via DefaultAzureCredential — just run `az login` first
pip install -r requirements.txt
az login                        # one-time — authenticates to Azure
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Idea → Script**: GPT-4o turns your one-line idea + characters into a structured comic script
2. **Script → Images**: DALL-E 3 generates each panel with consistent character descriptions
3. **Images → Strip**: Pillow composites panels with speech bubbles and borders
4. **Editor**: Drag-reorder panels, edit dialogue, regenerate any panel
5. **Export**: Download your strip as PNG
