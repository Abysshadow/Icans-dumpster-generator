// /api/animate.js
//
// Kicks off a Google Veo 3.1 Fast image-to-video generation job (8-second clips).
// Returns the operation name immediately — the client polls /api/animate-status to get the result.
//
// SECURITY HARDENED:
// - API key passed as x-goog-api-key header (never in URL)
// - All error messages sanitized before being sent to the browser
// - Detailed errors logged server-side for debugging (Vercel logs only)

/* ──────────────────────────────────────────────
   SECURITY HELPERS
   ────────────────────────────────────────────── */

function sanitizeError(message) {
  if (!message || typeof message !== "string") return "An error occurred.";
  return message
    .replace(/AIza[A-Za-z0-9_-]{35,}/g, "[REDACTED_KEY]")
    .replace(/AQ\.[A-Za-z0-9_-]{40,}/g, "[REDACTED_KEY]")
    .replace(/[?&]key=[^&\s]+/g, "")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED]");
}

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

  const { prompt, image } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ error: "An animation prompt of at least 5 characters is required." });
  }

  if (!image || typeof image !== "string" || !image.startsWith("data:")) {
    return res.status(400).json({ error: "A starting image is required." });
  }

  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Invalid image format." });
  }
  const [, mimeType, base64] = match;

  const modelId = "veo-3.1-fast-generate-preview";
  // Key is NOT in the URL — passed via header below
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning`;

  const body = {
    instances: [{
      prompt: prompt,
      image: {
        bytesBase64Encoded: base64,
        mimeType: mimeType,
      },
    }],
    parameters: {
      aspectRatio: "16:9",
      durationSeconds: 8,
    },
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
      logServerError("Veo API error:", data);
      const userMessage = sanitizeError(data?.error?.message) || `Animation request failed (status ${r.status}).`;
      return res.status(r.status).json({ error: userMessage });
    }

    const operationName = data?.name;
    if (!operationName) {
      logServerError("No operation name in Veo response:", data);
      return res.status(500).json({ error: "The animation service did not respond as expected." });
    }

    return res.status(200).json({ operationName });
  } catch (err) {
    logServerError("Animate handler crashed:", err.message || err);
    return res.status(500).json({
      error: "Animation could not be started. Please try again."
    });
  }
}
