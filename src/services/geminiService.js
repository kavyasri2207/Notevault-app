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

  const prompt = `Analyze this note for a productivity app.
Please return a JSON object with the exact following structure:
{
  "summary": "3-5 concise bullet points summarizing the main ideas of the note",
  "actionItems": ["Array of extracted tasks or action items. Empty array if none."],
  "tags": ["Array of 2-3 relevant topic tags (e.g. #work, #ideas)"]
}

Title: ${title}
Content: ${content}`;

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
            maxOutputTokens: 800,
            responseMimeType: "application/json",
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

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        
        let rawSummary = parsed.summary || "";
        if (Array.isArray(rawSummary)) {
          rawSummary = rawSummary.map(s => "• " + s).join("\n");
        }
        let finalOutput = cleanSummary(rawSummary);

        if (parsed.actionItems && parsed.actionItems.length > 0) {
          finalOutput += "\n\n🎯 Action Items:\n" + parsed.actionItems.map(item => "• " + item).join("\n");
        }

        if (parsed.tags && parsed.tags.length > 0) {
          finalOutput += "\n\n🏷️ Tags: " + parsed.tags.map(tag => tag.startsWith("#") ? tag : "#" + tag).join(" ");
        }

        if (finalOutput) {
          return finalOutput.trim();
        }
      } catch (err) {
        // Fallback if the AI didn't return valid JSON
        return cleanSummary(responseText);
      }
    }

    lastError = new Error(`Gemini returned an empty summary from ${model}`);
  }

  throw lastError || new Error("Gemini summarization failed");
};

const generateTitle = async (content) => {
  if (!process.env.GEMINI_API_KEY) return "Untitled Note";

  try {
    const prompt = `Read the following note and generate a very short, catchy title (max 5 words). Return ONLY the title string without quotes.\n\nContent: ${content}`;
    const model = getGeminiModels()[0]; // Use the first model (e.g., flash-lite)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 20 },
        }),
      }
    );

    const data = await response.json();
    let generatedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Untitled Note";
    return generatedTitle.replace(/^["']|["']$/g, ''); // remove quotes if any
  } catch (error) {
    return "Untitled Note";
  }
};

const chatWithNote = async (title, content, question) => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  try {
    const prompt = `You are a helpful AI assistant inside a notes application. Answer the user's question based strictly on the note below. Do not make up information that isn't in the note. Keep your answer concise and helpful.

Note Title: ${title}
Note Content: ${content}

User Question: ${question}`;

    const model = getGeminiModels()[0]; 
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Chat failed");

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I couldn't generate an answer.";
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = { summarizeText, generateTitle, chatWithNote };
