
const generateBtn = document.getElementById("generate");
const promptInput = document.getElementById("prompt");
const durationInput = document.getElementById("duration");
const styleInput = document.getElementById("style");
const ratioInput = document.getElementById("ratio");
const statusText = document.getElementById("status");

generateBtn.addEventListener("click", async function () {

    const prompt = promptInput.value.trim();

    if (prompt === "") {
        statusText.textContent = "⚠️ Please enter your video prompt!";
        return;
    }

    statusText.textContent = "⏳ Submitting your video request...";
    generateBtn.textContent = "Submitting...";
    generateBtn.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:8000/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                duration: Number(durationInput.value),
                style: styleInput.value,
                aspect_ratio: ratioInput.value.split(" ")[0],
            }),
        });
        const result = await response.json();

        if (!response.ok) {
            const detail = Array.isArray(result.detail)
                ? result.detail.map((issue) => issue.msg).join(" ")
                : result.detail;
            throw new Error(detail || `Request failed (${response.status}).`);
        }

        statusText.textContent = `✅ ${result.message}`;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        statusText.textContent = `❌ Unable to submit request: ${message}`;
    } finally {
        generateBtn.textContent = "Generate AI Video";
        generateBtn.disabled = false;
    }
});
