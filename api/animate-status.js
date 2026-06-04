// /api/animate-status.js
//
// Polls a Veo operation for completion. Called repeatedly by the client until done.
//
// SECURITY HARDENED:
// - API key passed as x-goog-api-key header on operation status checks
// - All error messages sanitized before being sent to the browser
// - Detailed errors logged server-side for debugging (Vercel logs only)
//
// NOTE: The Google Files API (used to download finished videos) still requires
// the key as a URL query parameter. We pass it there because that fetch is server-to-server
// only and the URL is never echoed back to the browser.

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

  const { operationName } = req.body || {};
  if (!operationName || typeof operationName !== "string") {
    return res.status(400).json({ error: "operationName is required." });
  }

  // Key is NOT in the URL — passed via header below
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  try {
    const r = await fetch(url, {
      headers: {
        "x-goog-api-key": apiKey,  // ← Key in header, NOT in URL
      },
    });
    const data = await r.json();

    if (!r.ok) {
      logServerError("Veo status error:", data);
      const userMessage = sanitizeError(data?.error?.message) || `Status check failed (status ${r.status}).`;
      return res.status(r.status).json({ error: userMessage });
    }

    if (!data.done) {
      return res.status(200).json({ done: false });
    }

    if (data.error) {
      logServerError("Veo job failed:", data.error);
      return res.status(200).json({
        done: true,
        error: sanitizeError(data.error.message) || "Video generation failed.",
      });
    }

    const resp = data.response || {};

    let videoUri = null;
    const candidates = [
      resp?.generateVideoResponse?.generatedSamples,
      resp?.generatedVideos,
      resp?.videos,
      resp?.predictions,
    ];

    for (const arr of candidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        const item = arr[0];
        videoUri = item?.video?.uri || item?.videoUri || item?.uri || item?.video?.gcsUri;
        if (videoUri) break;
      }
    }

    if (!videoUri) {
      logServerError("No video URI in completed operation:", data);
      return res.status(200).json({
        done: true,
        error: "The video finished but couldn't be retrieved. Please try again.",
      });
    }

    // Fetch the actual video bytes. The Files API requires the key as a query param,
    // but this fetch is server-to-server only — the URL never reaches the browser.
    const fetchUrl = videoUri.includes("?")
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`;

    const videoRes = await fetch(fetchUrl);
    if (!videoRes.ok) {
      logServerError("Failed to fetch video from Veo:", { status: videoRes.status });
      return res.status(200).json({
        done: true,
        error: "Could not download the finished video. Please try again.",
      });
    }

    const videoBuffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(videoBuffer).toString("base64");
    const dataUrl = `data:video/mp4;base64,${base64}`;

    return res.status(200).json({ done: true, url: dataUrl });
  } catch (err) {
    logServerError("Status handler crashed:", err.message || err);
    return res.status(500).json({
      error: "Animation status check failed. Please try again."
    });
  }
}
