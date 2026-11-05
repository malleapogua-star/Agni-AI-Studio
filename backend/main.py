
import os
import shutil
import tempfile
import logging
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from gradio_client import Client, handle_file


# ===============================
# CONFIGURATION
# ===============================

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agni-ai")


app = FastAPI(title="AGNI AI Studio Backend")
app.state.huggingface_api_token = os.getenv(
    "HUGGINGFACEHUB_API_TOKEN"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agni-ai-studio-1.onrender.com",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

LTX_SPACE = "Lightricks/ltx-video-distilled"
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

RESOLUTION_DIMENSIONS = {
    "480p": {
        "16:9": (854, 480),
        "9:16": (480, 854),
        "1:1": (480, 480),
    },
    "720p": {
        "16:9": (1280, 720),
        "9:16": (720, 1280),
        "1:1": (720, 720),
    },
}


# ===============================
# HEALTH CHECK
# ===============================

@app.get("/")
async def home():
    return {
        "message": "Welcome to AGNI AI Studio Backend"
    }


@app.get("/health")
def health_check():
    return {"status": "AGNI AI Backend Running"}


# ===============================
# VIDEO GENERATION
# ===============================

@app.post("/generate")
def generate_video(
    prompt: str = Form(...),
    duration: float = Form(5),
    style: Literal[
        "Realistic",
        "Cinematic",
        "Anime",
        "3D Animation"
    ] = Form("Realistic"),
    aspect_ratio: Literal[
        "16:9",
        "9:16",
        "1:1"
    ] = Form("16:9"),
    resolution: Literal["480p", "720p", "1080p"] = Form("480p"),
    image: UploadFile | None = File(None),
):

    if not prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Please enter a video prompt."
        )

    if len(prompt) > 4000:
        raise HTTPException(
            status_code=400,
            detail="Prompt must not exceed 4000 characters."
        )

    if not 0.3 <= duration <= 8.5:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 0.3 and 8.5 seconds."
        )

    if resolution == "1080p":
        raise HTTPException(
            status_code=400,
            detail=(
                "1080p is unavailable: the LTX Video Fast Space "
                "limits generated width and height to 1280 pixels."
            )
        )

    width, height = RESOLUTION_DIMENSIONS[resolution][aspect_ratio]
    temp_dir = tempfile.mkdtemp(prefix="agni_ai_")

    try:
        # ===============================
        # IMAGE VALIDATION
        # ===============================

        input_path = None

        if image is not None:

            extension = IMAGE_EXTENSIONS.get(image.content_type)

            if extension is None:
                raise HTTPException(
                    status_code=400,
                    detail="Upload PNG, JPG or WEBP images only."
                )

            image.file.seek(0, os.SEEK_END)
            image_size = image.file.tell()
            image.file.seek(0)

            if image_size > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail="Image size must be 10 MB or less."
                )

            input_path = os.path.join(
                temp_dir,
                f"reference{extension}"
            )

            with open(input_path, "wb") as output:
                shutil.copyfileobj(image.file, output)

        # ===============================
        # CONNECT TO LTX VIDEO FAST
        # ===============================

        logger.info("Connecting to LTX Video Space...")

        client = Client(LTX_SPACE)

        final_prompt = (
            f"{prompt.strip()}. "
            f"Visual style: {style}."
        )

        negative_prompt = (
            "worst quality, inconsistent motion, "
            "blurry, jittery, distorted"
        )

        # ===============================
        # IMAGE TO VIDEO
        # ===============================

        if input_path:

            logger.info("Starting image-to-video generation...")

            result = client.predict(
                prompt=final_prompt,
                negative_prompt=negative_prompt,
                input_image_filepath=handle_file(input_path),
                input_video_filepath=None,
                height_ui=height,
                width_ui=width,
                mode="image-to-video",
                duration_ui=duration,
                ui_frames_to_use=9,
                seed_ui=42,
                randomize_seed=True,
                ui_guidance_scale=1,
                improve_texture_flag=True,
                api_name="/image_to_video",
            )

        # ===============================
        # TEXT TO VIDEO
        # ===============================

        else:

            logger.info("Starting text-to-video generation...")

            result = client.predict(
                prompt=final_prompt,
                negative_prompt=negative_prompt,
                input_image_filepath=None,
                input_video_filepath=None,
                height_ui=height,
                width_ui=width,
                mode="text-to-video",
                duration_ui=duration,
                ui_frames_to_use=9,
                seed_ui=42,
                randomize_seed=True,
                ui_guidance_scale=1,
                improve_texture_flag=True,
                api_name="/text_to_video",
            )

        # ===============================
        # GET GENERATED VIDEO
        # ===============================

        if not result or not isinstance(result, (list, tuple)):
            raise RuntimeError("Unexpected response received from LTX.")

        video_info = result[0]

        if isinstance(video_info, dict):
            video_path = video_info.get("video")
        else:
            video_path = video_info

        if isinstance(video_path, dict):
            video_path = video_path.get("path")

        if not video_path or not os.path.isfile(video_path):
            raise RuntimeError(
                "LTX did not return a valid video file."
            )

        # Copy output into a temporary directory.
        # It will be deleted only after the response is sent.

        output_path = os.path.join(
            temp_dir,
            "agni-ai-video.mp4"
        )

        shutil.copy2(video_path, output_path)

        logger.info("Video generation completed successfully.")

        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename="agni-ai-video.mp4",
            background=BackgroundTask(
                shutil.rmtree,
                temp_dir,
                ignore_errors=True
            ),
        )

    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

    except Exception as exc:

        logger.exception("AGNI AI video generation failed")

        shutil.rmtree(temp_dir, ignore_errors=True)

        raise HTTPException(
            status_code=500,
            detail=(
                "Video generation failed. "
                "The LTX Space may be busy or unavailable. "
                "Please try again later."
            )
        ) from exc
