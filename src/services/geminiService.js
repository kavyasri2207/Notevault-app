const getGeminiModels = () => {
  const configuredModels = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL;
  const defaults = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  const models = configuredModels
    ? configuredModels.split(",").map((model) => model.trim()).filter(Boolean)
    : ["gemini-2.5-flash", ...defaults];

  return [...new Set([...models, ...defaults])];
};

const isRetryableGeminiError = (status, message = "") =>
  [429, 500, 502, 503, 504].includes(status) ||
  message.toLowerCase().includes("high demand") ||
  message.toLowerCase().includes("overloaded");

const cleanSummary = (summary) =>
  summary
    .replace(/^here(?:'|’)s\s+(?:a\s+)?summary(?:\s+of\s+(?:your|the)\s+note)?\s*:?\s*/i, "")
    .replace(/^summary(?:\s+of\s+(?:your|the)\s+note)?\s*:?\s*/i, "")
    .trim();

const summarizeText = async ({ title, content }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = [
    "Summarize this note for a productivity notes app.",
    "Return only the summary content.",
    "Do not include an introduction, title, heading, or phrase like \"Here's a summary\".",
    "Use 3-5 concise bullet points and preserve important actions, dates, and decisions.",
    `Title: ${title}`,
    `Content: ${content}`,
  ].join("\n\n");

  let lastError = null;

  for (const model of getGeminiModels()) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 220,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data.error?.message || `Gemini summarization failed with ${model}`;
      lastError = new Error(message);

      if (isRetryableGeminiError(response.status, message)) {
        continue;
      }

      throw lastError;
    }

    const summary = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join("")
      .trim();

    const cleanedSummary = summary ? cleanSummary(summary) : "";

    if (cleanedSummary) {
      return cleanedSummary;
    }

    lastError = new Error(`Gemini returned an empty summary from ${model}`);
  }

  throw lastError || new Error("Gemini summarization failed");
};

module.exports = { summarizeText };
