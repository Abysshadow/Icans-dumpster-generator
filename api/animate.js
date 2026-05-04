// /api/animate.js
// Kicks off a Google Veo 3.1 Fast image-to-video generation job (8-second clips).
// Returns the operation name immediately — the client polls /api/animate-status to get the result.
//
// IMPORTANT: Veo 3.1 only supports 8-second clips. Earlier we tried 4s but Veo silently
// produced weird results or hung. Stick with 8s as the spec requires.
//
// Cost: ~$0.40 per 8-second clip with Veo Fast (vs ~$1.50 for full Veo 3.1).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing the Gemini API key. Add GEMINI_API_KEY in Vercel and redeploy."
    });
  }

  const { prompt, image } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ error: "An animation prompt of at least 5 characters is required." });
  }

  if (!image || typeof image !== "string" || !image.startsWith("data:")) {
    return res.status(400).json({ error: "A starting image is required (must be a data URL)." });
  }

  // Parse the image data URL
  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Invalid image format. Expected a base64 data URL." });
  }
  const [, mimeType, base64] = match;

  // Veo 3.1 Fast — 8 seconds (Veo's only supported duration), 16:9.
  const modelId = "veo-3.1-fast-generate-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Veo API error:", JSON.stringify(data));
      const msg = data?.error?.message || `Veo API returned status ${r.status}`;
      return res.status(r.status).json({ error: msg });
    }

    // Veo returns an operation name like "models/veo-3.1-.../operations/abc123"
    const operationName = data?.name;
    if (!operationName) {
      console.error("No operation name in Veo response:", JSON.stringify(data));
      return res.status(500).json({ error: "Veo did not return an operation handle." });
    }

    return res.status(200).json({ operationName });
  } catch (err) {
    console.error("Animate handler crashed:", err);
    return res.status(500).json({
      error: err.message || "Internal server error. Check Vercel function logs for details."
    });
  }
}
