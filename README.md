# AI Strip — Cartoon Strip Generator

Turn any idea into a cartoon strip using AI.

## Architecture

- **Frontend**: Next.js 14 (React + Tailwind CSS)
- **Backend**: Python FastAPI
- **AI**: Azure OpenAI (GPT-5.4 for text, GPT-Image-1.5 for images) — authenticated via Entra ID (DefaultAzureCredential), no API keys
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

## Features

- **AI Idea Refiner** — iterate on your comic idea with AI before committing
- **AI Character Suggestion** — auto-generate characters from your idea
- **Character Reference Upload** — upload an image and GPT-5.4 vision describes it for consistent prompts
- **Parallel Image Generation** — all panels generate concurrently for faster results
- **Interactive Strip Editor** — drag-reorder panels, edit dialogue inline, regenerate any panel
- **Export** — download your finished strip as PNG

## How It Works

1. **Idea → Refine**: Optionally iterate on your rough idea with AI assistance
2. **Characters**: Define manually, upload reference images, or let AI suggest them
3. **Script**: GPT-5.4 turns your idea + characters into a structured comic script
4. **Images**: GPT-Image-1.5 generates all panels in parallel with consistent character descriptions
5. **Composite**: Pillow adds speech bubbles, borders, and assembles the final strip
6. **Edit & Export**: Tweak in the editor, then download as PNG
