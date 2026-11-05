```javascript
const BACKEND_URL = "https://agni-ai-backend.onrender.com";

const generateBtn = document.getElementById("generate");
const promptInput = document.getElementById("prompt");
const durationInput = document.getElementById("duration");
const styleInput = document.getElementById("style");
const ratioInput = document.getElementById("ratio");
const statusText = document.getElementById("status");

generateBtn.addEventListener("click", async function () {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        statusText.textContent = "⚠️ Please enter your video prompt!";
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
                aspect_ratio: ratioInput.value.split(" ")[0]
            })
        });

        const result = await response.json();

        if (!response.ok) {
            const detail = Array.isArray(result.detail)
                ? result.detail.map(issue => issue.msg).join(" ")
                : result.detail;

            throw new Error(detail || `Request failed (${response.status})`);
        }

        statusText.textContent = `✅ ${result.message}`;

    } catch (error) {
        statusText.textContent =
            `❌ Unable to submit request: ${error.message}`;
    } finally {
        generateBtn.textContent = "Generate AI Video";
        generateBtn.disabled = false;
    }
});
```
