const BACKEND_URL = "https://agni-ai-backend.onrender.com";

const generateBtn = document.getElementById("generate");
const promptInput = document.getElementById("prompt");
const durationInput = document.getElementById("duration");
const styleInput = document.getElementById("style");
const ratioInput = document.getElementById("ratio");
const resolutionInput = document.getElementById("resolution");
const imageInput = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const statusText = document.getElementById("status");
const videoElement = document.getElementById("generatedVideo");

let currentVideoUrl = null;

if (imageInput && imagePreview) {
    imageInput.addEventListener("change", function () {
        const file = this.files[0];

        if (!file) {
            imagePreview.style.display = "none";
            imagePreview.removeAttribute("src");
            return;
        }

        if (!file.type.startsWith("image/")) {
            statusText.textContent = "⚠️ Please select a valid image.";
            this.value = "";
            imagePreview.style.display = "none";
            return;
        }

        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
        statusText.textContent = "✅ Reference image selected.";
    });
}

generateBtn.addEventListener("click", async function () {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        statusText.textContent = "⚠️ Please enter your video prompt!";
        promptInput.focus();
        return;
    }

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("duration", durationInput.value);
    formData.append("style", styleInput.value);
    formData.append("aspect_ratio", ratioInput.value);
    formData.append("resolution", resolutionInput.value);

    if (imageInput && imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "⏳ Generating...";
    statusText.textContent = "Connecting to AGNI AI Backend...";
    videoElement.style.display = "none";

    try {
        const response = await fetch(`${BACKEND_URL}/generate`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            let errorMessage = `Request failed (${response.status})`;

            try {
                const result = await response.json();

                if (typeof result.detail === "string") {
                    errorMessage = result.detail;
                } else if (Array.isArray(result.detail)) {
                    errorMessage = result.detail
                        .map(item => item.msg)
                        .join(", ");
                }
            } catch (_) {
                // Keep the HTTP status message when the server response is not JSON.
            }

            throw new Error(errorMessage);
        }

        const videoBlob = await response.blob();

        if (!videoBlob.type.startsWith("video/")) {
            throw new Error("Server did not return a valid video file.");
        }

        if (currentVideoUrl) {
            URL.revokeObjectURL(currentVideoUrl);
        }

        currentVideoUrl = URL.createObjectURL(videoBlob);
        videoElement.src = currentVideoUrl;
        videoElement.style.display = "block";
        videoElement.load();
        videoElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        statusText.textContent = "✅ Your AI video is ready!";
    } catch (error) {
        console.error("AGNI AI error:", error);
        statusText.textContent =
            `❌ Video generation failed: ${error.message || "Unable to connect to backend."}`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "✦ Generate AI Video";
    }
});

function downloadGeneratedVideo() {
    if (!currentVideoUrl) {
        statusText.textContent = "⚠️ Generate a video first.";
        return;
    }

    const link = document.createElement("a");
    link.href = currentVideoUrl;
    link.download = "AGNI-AI-Video.mp4";
    document.body.appendChild(link);
    link.click();
    link.remove();
}
