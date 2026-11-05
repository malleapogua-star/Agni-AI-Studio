const BACKEND_URL = "https://agni-ai-backend.onrender.com";

const generateBtn = document.getElementById("generate");
const promptInput = document.getElementById("prompt");
const durationInput = document.getElementById("duration");
const styleInput = document.getElementById("style");
const ratioInput = document.getElementById("ratio");
const statusText = document.getElementById("status");

const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");

// Show selected image preview
imageUpload.addEventListener("change", function () {
    const file = imageUpload.files[0];

    if (!file) {
        imagePreview.removeAttribute("src");
        imagePreview.style.display = "none";
        return;
    }

    if (!file.type.startsWith("image/")) {
        statusText.textContent = "⚠️ Please select a valid image.";
        imageUpload.value = "";
        return;
    }

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
});

// Send video request to backend
generateBtn.addEventListener("click", async function () {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        statusText.textContent = "⚠️ Please enter your video prompt!";
        promptInput.focus();
        return;
    }

    statusText.textContent = "⏳ Connecting to AGNI AI Backend...";
    generateBtn.textContent = "Submitting...";
    generateBtn.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt,
                duration: Number(durationInput.value),
                style: styleInput.value,
                aspect_ratio: ratioInput.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            const detail = Array.isArray(result.detail)
                ? result.detail.map(issue => issue.msg).join(" ")
                : result.detail;

            throw new Error(detail || `Server error: ${response.status}`);
        }

        statusText.textContent =
            `✅ ${result.message || "Your request was received."}`;

    } catch (error) {
        console.error("AGNI AI error:", error);

        statusText.textContent =
            `❌ ${error.message || "Unable to connect to backend."}`;

    } finally {
        generateBtn.textContent = "✦ Generate AI Video";
        generateBtn.disabled = false;
    }
});
