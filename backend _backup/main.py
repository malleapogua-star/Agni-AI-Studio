import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=False)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    duration: Literal[5, 10]
    style: Literal["Realistic", "Cinematic", "Anime", "3D Animation"]
    aspect_ratio: Literal["16:9", "9:16", "1:1"]

app = FastAPI(title="AGNI AI Studio Backend")
app.state.huggingface_api_token = os.getenv("HUGGINGFACEHUB_API_TOKEN")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "AGNI AI Backend Running"}


@app.post("/generate")
async def generate_video(request: GenerateRequest) -> dict[str, object]:
    return {
        "status": "accepted",
        "message": "Request received. Video generation is not configured yet.",
        "request": request.model_dump(),
    }