// /api/generate.js
//
// Vercel serverless function that calls Google's Gemini API for image generation.
//
// SECURITY HARDENED:
// - API key passed as x-goog-api-key header (never in URL)
// - All error messages sanitized before being sent to the browser
// - Detailed errors logged server-side for debugging (Vercel logs only)

/* ──────────────────────────────────────────────
   SECURITY HELPERS
   ────────────────────────────────────────────── */

// Removes anything that looks like an API key or credential from a string.
// Used to sanitize error messages before they reach the browser.
function sanitizeError(message) {
  if (!message || typeof message !== "string") return "An error occurred.";
  return message
    .replace(/AIza[A-Za-z0-9_-]{35,}/g, "[REDACTED_KEY]")        // Legacy Gemini keys
    .replace(/AQ\.[A-Za-z0-9_-]{40,}/g, "[REDACTED_KEY]")         // New-format Gemini keys
    .replace(/[?&]key=[^&\s]+/g, "")                              // Key in URL query
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED]"); // OAuth tokens
}

// Logs detailed errors to server-side logs (Vercel) without exposing them to browser.
// Strips any API key from logged data as a belt-and-suspenders measure.
function logServerError(label, data) {
  try {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    console.error(label, sanitizeError(str).slice(0, 1000));
  } catch {
    console.error(label, "[unserializable error data]");
  }
}

/* ──────────────────────────────────────────────
   MAIN HANDLER
   ────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing the Gemini API key. Contact support."
    });
  }

  const { prompt, quality = "standard", logo = null } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
    return res.status(400).json({ error: "A prompt of at least 10 characters is required." });
  }

  const modelId = quality === "pro"
    ? "gemini-3-pro-image-preview"
    : "gemini-2.5-flash-image";

  // Key is NOT in the URL — passed via header below
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const parts = [{ text: prompt }];

  if (logo && typeof logo === "string" && logo.startsWith("data:")) {
    const match = logo.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "16:9" }
    }
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,  // ← Key in header, NOT in URL
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      logServerError("Gemini API error:", data);
      const userMessage = sanitizeError(data?.error?.message) || `Image generation failed (status ${r.status}).`;
      return res.status(r.status).json({ error: userMessage });
    }

    const respParts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = respParts.find(p => p.inlineData && p.inlineData.data);

    if (!imgPart) {
      const textPart = respParts.find(p => p.text);
      logServerError("No image in Gemini response:", data);
      return res.status(500).json({
        error: sanitizeError(textPart?.text) || "The image could not be generated. Try rephrasing the prompt."
      });
    }

    const mimeType = imgPart.inlineData.mimeType || "image/png";
    const base64 = imgPart.inlineData.data;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({ url: dataUrl, model: modelId });
  } catch (err) {
    logServerError("Generate handler crashed:", err.message || err);
    return res.status(500).json({
      error: "Image generation failed. Please try again."
    });
  }
}
