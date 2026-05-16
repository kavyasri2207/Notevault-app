const { connectToDatabase } = require("./shared/db");
const { successResponse, errorResponse } = require("./shared/response");
const Note = require("./Note"); // Reuse model

const getGeminiModels = () => {
  const configuredModels = process.env.GEMINI_MODELS;
  const defaults = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  return configuredModels
    ? [...new Set([...configuredModels.split(",").map(m => m.trim()), ...defaults])]
    : ["gemini-2.5-flash", ...defaults];
};

const cleanSummary = (summary) =>
  summary
    .replace(/^here(?:'|’)s\s+(?:a\s+)?summary(?:\s+of\s+(?:your|the)\s+note)?\s*:?\s*/i, "")
    .replace(/^summary(?:\s+of\s+(?:your|the)\s+note)?\s*:?\s*/i, "")
    .trim();

exports.handler = async (event) => {
  const { pathParameters, requestContext } = event;
  const userSub = requestContext.authorizer.jwt.claims.sub;
  const noteId = pathParameters.id;

  try {
    await connectToDatabase();
    
    const note = await Note.findOne({ _id: noteId, user: userSub });
    if (!note) return errorResponse("Note not found", 404);

    const prompt = [
      "Summarize this note for a productivity notes app.",
      "Return only the summary content.",
      "Do not include an introduction, title, heading, or phrase like \"Here's a summary\".",
      "Use 3-5 concise bullet points and preserve important actions, dates, and decisions.",
      `Title: ${note.title}`,
      `Content: ${note.content}`,
    ].join("\n\n");

    let lastError = null;
    const models = getGeminiModels();

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 250 },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `Gemini failed with ${model}`);

        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (summary) {
          return successResponse({ data: { summary: cleanSummary(summary) } });
        }
      } catch (err) {
        console.warn(`Model ${model} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Summarization failed");
  } catch (error) {
    console.error("Summarize Error:", error);
    return errorResponse("Summarization failed", 500, error);
  }
};
