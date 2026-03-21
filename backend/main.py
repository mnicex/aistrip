"""AI Strip — FastAPI backend."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routers import images, scripts, strips

app = FastAPI(title="AI Strip", version="0.1.0")

# CORS — allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(scripts.router)
app.include_router(images.router)
app.include_router(strips.router)

# Serve generated images statically
output_dir = Path(get_settings().output_dir)
output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "aistrip"}
